import { supabase, isSupabaseConfigured } from './supabaseClient';
import { memoryStore } from './dbStore';
import { auditService } from './auditService';
import { personService } from './personService';
import { ingestionService } from './ingestionService';
import { buildHouseholdGroups, deriveFamilyAttributes } from '../lib/familyFormation';

export const familyService = {
  /**
   * Reconciles families from staged source records and linked persons.
   * Idempotent and re-runnable (§8, §9).
   */
  async reconcileFamilies(actorRole = 'System', actorName = 'Reconciliation Engine') {
    const sourceRecords = await ingestionService.getSourceRecords();
    const persons = await personService.getPersons();
    const matchReviews = await personService.getMatchReviews();

    const { householdGroups, unassignedPersons } = buildHouseholdGroups(
      sourceRecords,
      persons,
      matchReviews
    );

    // Fetch existing families to maintain idempotency
    const existingFamilies = await this.getRawFamilies();
    const existingFamilyMap = new Map(existingFamilies.map(f => [f.household_ref, f]));

    const reconciledFamilies = [];
    const reconciledMembers = [];
    const newFamiliesCreated = [];

    for (const group of householdGroups) {
      if (group.isHeldBack) {
        continue; // Household held back until pending review is resolved
      }

      if (group.personIds.size === 0) {
        continue;
      }

      const derived = deriveFamilyAttributes(group, persons);

      let familyId;
      const existing = existingFamilyMap.get(derived.household_ref);

      if (existing) {
        familyId = existing.family_id;
      } else {
        familyId = memoryStore.getNextFamilyId();
        newFamiliesCreated.push({
          familyId,
          householdRef: derived.household_ref,
          district: derived.district,
          headPersonId: derived.head_person_id
        });
      }

      const familyEntity = {
        family_id: familyId,
        household_ref: derived.household_ref,
        address: derived.address,
        district: derived.district,
        taluka: derived.taluka,
        city_or_village: derived.city_or_village,
        household_income: derived.household_income,
        income_source: derived.income_source,
        family_category: derived.family_category,
        family_status: 'ACTIVE',
        head_person_id: derived.head_person_id,
        updated_at: new Date().toISOString()
      };

      if (!existing) {
        familyEntity.created_at = new Date().toISOString();
      }

      reconciledFamilies.push(familyEntity);

      // Reconcile family members
      for (const m of derived.members) {
        reconciledMembers.push({
          family_id: familyId,
          person_id: m.person_id,
          relationship: m.relationship,
          status: 'ACTIVE'
        });
      }
    }

    // Update memoryStore
    memoryStore.families = reconciledFamilies;
    memoryStore.familyMembers = reconciledMembers;

    // Persist to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        if (reconciledFamilies.length > 0) {
          await supabase.from('family').upsert(reconciledFamilies, { onConflict: 'family_id' });
        }
        if (reconciledMembers.length > 0) {
          await supabase.from('family_member').upsert(reconciledMembers, { onConflict: 'family_id,person_id' });
        }
      } catch (err) {
        console.warn('Supabase reconcileFamilies persistence error:', err.message);
      }
    }

    // Audit newly formed families
    for (const nf of newFamiliesCreated) {
      await auditService.log({
        actor_role: actorRole,
        actor_name: actorName,
        action: 'FAMILY_CREATED',
        entity_type: 'FAMILY',
        entity_id: nf.familyId,
        details: {
          household_ref: nf.householdRef,
          district: nf.district,
          head_person_id: nf.headPersonId
        }
      });
    }

    return {
      families: reconciledFamilies,
      familyMembers: reconciledMembers,
      unassignedPersons,
      heldBackHouseholds: householdGroups.filter(g => g.isHeldBack)
    };
  },

  /**
   * Internal helper to fetch raw families list
   */
  async getRawFamilies() {
    const map = new Map();
    memoryStore.families.forEach(f => map.set(f.family_id, f));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('family').select('*');
        if (!error && data) {
          data.forEach(f => map.set(f.family_id, f));
        }
      } catch (err) {
        console.warn('Supabase fetch families error:', err.message);
      }
    }

    return Array.from(map.values());
  },

  /**
   * Get families with search, district filter, and joined head details & member count
   */
  async getFamilies({ district = '', search = '' } = {}) {
    const rawFamilies = await this.getRawFamilies();
    const persons = await personService.getPersons();
    const personMap = new Map(persons.map(p => [p.person_id, p]));

    // Fetch members
    const membersMap = new Map();
    memoryStore.familyMembers.forEach(m => {
      if (!membersMap.has(m.family_id)) membersMap.set(m.family_id, []);
      membersMap.get(m.family_id).push(m);
    });

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('family_member').select('*');
        if (data) {
          data.forEach(m => {
            if (!membersMap.has(m.family_id)) membersMap.set(m.family_id, []);
            const existingList = membersMap.get(m.family_id);
            if (!existingList.some(x => x.person_id === m.person_id)) {
              existingList.push(m);
            }
          });
        }
      } catch (err) {
        console.warn('Supabase fetch family members error:', err.message);
      }
    }

    let result = rawFamilies.map(fam => {
      const head = personMap.get(fam.head_person_id) || null;
      const members = membersMap.get(fam.family_id) || [];
      return {
        ...fam,
        head_name: head?.canonical_name || 'Unknown',
        head_person: head,
        member_count: members.length,
        members
      };
    });

    if (district && district !== 'ALL') {
      result = result.filter(f => (f.district || '').toLowerCase() === district.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(f => 
        (f.family_id || '').toLowerCase().includes(q) ||
        (f.household_ref || '').toLowerCase().includes(q) ||
        (f.head_name || '').toLowerCase().includes(q) ||
        (f.district || '').toLowerCase().includes(q) ||
        (f.address || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.family_id.localeCompare(b.family_id));
  },

  /**
   * Get complete family profile by Family ID:
   * - Family metadata
   * - Head person details
   * - Members with relationship, age, gender, identity status
   * - Provenance: all linked source records per member
   */
  async getFamilyById(familyId) {
    const rawFamilies = await this.getRawFamilies();
    const family = rawFamilies.find(f => f.family_id === familyId);
    if (!family) return null;

    const persons = await personService.getPersons();
    const personMap = new Map(persons.map(p => [p.person_id, p]));
    const sourceRecords = await ingestionService.getSourceRecords();

    // Get family members
    const membersMap = new Map();
    memoryStore.familyMembers.filter(m => m.family_id === familyId).forEach(m => membersMap.set(m.person_id, m));

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('family_member').select('*').eq('family_id', familyId);
        if (data) {
          data.forEach(m => membersMap.set(m.person_id, m));
        }
      } catch (err) {
        console.warn('Supabase fetch family_member by familyId error:', err.message);
      }
    }

    const membersWithDetails = Array.from(membersMap.values()).map(fm => {
      const person = personMap.get(fm.person_id) || null;
      const linkedRecords = sourceRecords.filter(r => r.person_id === fm.person_id);

      return {
        ...fm,
        person,
        canonical_name: person?.canonical_name || 'Unknown',
        dob: person?.dob || null,
        gender: person?.gender || null,
        identity_status: person?.identity_status || 'UNVERIFIED',
        identity_reference: person?.identity_reference || null,
        occupation: person?.occupation || null,
        is_student: person?.is_student || false,
        source_records: linkedRecords
      };
    });

    const head = personMap.get(family.head_person_id) || null;

    return {
      ...family,
      head,
      head_name: head?.canonical_name || 'Unknown',
      members: membersWithDetails
    };
  },

  /**
   * Get all unassigned persons (no active family association)
   */
  async getUnassignedPersons() {
    const persons = await personService.getPersons();
    const sourceRecords = await ingestionService.getSourceRecords();
    const matchReviews = await personService.getMatchReviews();

    const { unassignedPersons } = buildHouseholdGroups(sourceRecords, persons, matchReviews);

    return unassignedPersons.map(p => {
      const linkedRecords = sourceRecords.filter(r => r.person_id === p.person_id);
      const district = linkedRecords[0]?.district || 'Unknown';
      return {
        ...p,
        district,
        source_records: linkedRecords,
        departments: Array.from(new Set(linkedRecords.map(r => r.department)))
      };
    });
  },

  /**
   * Get family summary by a member's person ID
   */
  async getFamilyByMemberId(personId) {
    if (!personId) return null;
    let memberRecord = memoryStore.familyMembers.find(m => m.person_id === personId);

    if (!memberRecord && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('family_member').select('*').eq('person_id', personId).single();
        if (data) memberRecord = data;
      } catch (err) {
        // ignore
      }
    }

    if (!memberRecord) return null;
    return memberRecord;
  }
};
