import { supabase, isSupabaseConfigured } from './supabaseClient';
import { memoryStore } from './dbStore';
import { auditService } from './auditService';
import { personService } from './personService';
import { familyService } from './familyService';
import { ingestionService } from './ingestionService';
import { evaluateSchemeEligibility } from '../lib/eligibility';
import { findBenefitGaps } from '../lib/benefitGaps';
import { buildBenefitMatrix } from '../lib/benefitMatrix';

export const schemeService = {
  /**
   * Fetch all schemes with rules and application config
   */
  async getSchemes() {
    const map = new Map();
    memoryStore.schemes.forEach(s => map.set(s.scheme_code, s));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('scheme').select('*').order('scheme_code');
        if (!error && data) {
          data.forEach(s => map.set(s.scheme_code, s));
        }
      } catch (err) {
        console.warn('Supabase fetch schemes error, using memoryStore:', err.message);
      }
    }

    return Array.from(map.values()).filter(s => s.active !== false);
  },

  /**
   * Get single scheme by code
   */
  async getSchemeByCode(schemeCode) {
    const schemes = await this.getSchemes();
    return schemes.find(s => s.scheme_code === schemeCode) || null;
  },

  /**
   * Synchronizes department enrollments from source records carrying enrolled flags (§7).
   * E.g. scholarship_enrolled = Y -> STU-EDU; health_scheme_enrolled = Y -> FAM-HEALTH;
   * worker_scheme_enrolled = Y -> LABOUR-WELFARE; housing_scheme_enrolled = Y -> HOUSING.
   */
  async syncDepartmentEnrollments() {
    const sourceRecords = await ingestionService.getSourceRecords();
    const families = await familyService.getRawFamilies();
    const familyMemberMap = new Map(); // person_id -> family_id
    
    // Map person to family
    if (memoryStore.familyMembers) {
      memoryStore.familyMembers.forEach(m => {
        if (m.status === 'ACTIVE') familyMemberMap.set(m.person_id, m.family_id);
      });
    }

    const existingEnrollments = await this.getEnrollments();
    const existingMap = new Map(
      existingEnrollments.map(e => [`${e.subject_id}_${e.scheme_code}`, e])
    );

    const newEnrollments = [];

    for (const record of sourceRecords) {
      if (!record.person_id) continue;
      const personFamilyId = familyMemberMap.get(record.person_id) || null;

      // 1. Education -> STU-EDU
      const eduFlag = record.attributes?.scholarship_enrolled || record.raw?.scholarship_enrolled;
      if (record.department === 'Education' && (eduFlag === true || eduFlag === 'Y' || eduFlag === 'true')) {
        const key = `${record.person_id}_STU-EDU`;
        if (!existingMap.has(key)) {
          const enrollment = {
            enrollment_id: crypto.randomUUID(),
            scheme_code: 'STU-EDU',
            subject_type: 'PERSON',
            subject_id: record.person_id,
            family_id: personFamilyId,
            status: 'ENROLLED',
            source: 'DEPARTMENT_RECORD',
            source_department: 'Education',
            application_id: null,
            enrolled_at: record.created_at || new Date().toISOString(),
            last_benefit_date: '2024-04-01',
            next_renewal_date: '2025-04-01'
          };
          newEnrollments.push(enrollment);
          existingMap.set(key, enrollment);
        }
      }

      // 2. Health -> FAM-HEALTH (Family-level scheme)
      const hltFlag = record.attributes?.health_scheme_enrolled || record.raw?.health_scheme_enrolled;
      if (record.department === 'Health' && (hltFlag === true || hltFlag === 'Y' || hltFlag === 'true')) {
        if (personFamilyId) {
          const key = `${personFamilyId}_FAM-HEALTH`;
          if (!existingMap.has(key)) {
            const enrollment = {
              enrollment_id: crypto.randomUUID(),
              scheme_code: 'FAM-HEALTH',
              subject_type: 'FAMILY',
              subject_id: personFamilyId,
              family_id: personFamilyId,
              status: 'ENROLLED',
              source: 'DEPARTMENT_RECORD',
              source_department: 'Health',
              application_id: null,
              enrolled_at: record.created_at || new Date().toISOString(),
              last_benefit_date: '2024-01-15',
              next_renewal_date: '2025-01-15'
            };
            newEnrollments.push(enrollment);
            existingMap.set(key, enrollment);
          }
        }
      }

      // 3. Labour -> LABOUR-WELFARE
      const labFlag = record.attributes?.worker_scheme_enrolled || record.raw?.worker_scheme_enrolled;
      if (record.department === 'Labour' && (labFlag === true || labFlag === 'Y' || labFlag === 'true')) {
        const key = `${record.person_id}_LABOUR-WELFARE`;
        if (!existingMap.has(key)) {
          const enrollment = {
            enrollment_id: crypto.randomUUID(),
            scheme_code: 'LABOUR-WELFARE',
            subject_type: 'PERSON',
            subject_id: record.person_id,
            family_id: personFamilyId,
            status: 'ENROLLED',
            source: 'DEPARTMENT_RECORD',
            source_department: 'Labour',
            application_id: null,
            enrolled_at: record.created_at || new Date().toISOString(),
            last_benefit_date: '2024-05-10',
            next_renewal_date: '2025-05-10'
          };
          newEnrollments.push(enrollment);
          existingMap.set(key, enrollment);
        }
      }

      // 4. Housing -> HOUSING (Family-level scheme)
      const hsgFlag = record.attributes?.housing_scheme_enrolled || record.raw?.housing_scheme_enrolled;
      if (record.department === 'Housing' && (hsgFlag === true || hsgFlag === 'Y' || hsgFlag === 'true')) {
        if (personFamilyId) {
          const key = `${personFamilyId}_HOUSING`;
          if (!existingMap.has(key)) {
            const enrollment = {
              enrollment_id: crypto.randomUUID(),
              scheme_code: 'HOUSING',
              subject_type: 'FAMILY',
              subject_id: personFamilyId,
              family_id: personFamilyId,
              status: 'ENROLLED',
              source: 'DEPARTMENT_RECORD',
              source_department: 'Housing',
              application_id: null,
              enrolled_at: record.created_at || new Date().toISOString(),
              last_benefit_date: '2023-11-20',
              next_renewal_date: '2026-11-20'
            };
            newEnrollments.push(enrollment);
            existingMap.set(key, enrollment);
          }
        }
      }
    }

    if (newEnrollments.length > 0) {
      memoryStore.enrollments.push(...newEnrollments);
      if (isSupabaseConfigured) {
        try {
          await supabase.from('enrollment').insert(newEnrollments);
        } catch (err) {
          console.warn('Supabase syncDepartmentEnrollments error:', err.message);
        }
      }
    }

    return Array.from(existingMap.values());
  },

  /**
   * Evaluates eligibility for all persons and families across all active schemes.
   * Idempotent upsert into eligibility_result table (§10).
   */
  async evaluateAll(actorRole = 'System', actorName = 'Eligibility Engine') {
    // 1. Sync department enrollments
    await this.syncDepartmentEnrollments();

    // 2. Fetch all registry data
    const schemes = await this.getSchemes();
    const families = await familyService.getRawFamilies();
    const persons = await personService.getPersons();
    const sourceRecords = await ingestionService.getSourceRecords();
    
    // Open conflicts (Task 12, empty for now)
    const openConflicts = memoryStore.dataConflicts ? memoryStore.dataConflicts.filter(c => c.status === 'OPEN') : [];

    // Map family to its active members
    const familyToMembers = new Map();
    memoryStore.familyMembers.forEach(m => {
      if (m.status === 'ACTIVE') {
        if (!familyToMembers.has(m.family_id)) familyToMembers.set(m.family_id, []);
        familyToMembers.get(m.family_id).push(m.person_id);
      }
    });

    // Map person to their family
    const personToFamily = new Map();
    for (const [famId, memIds] of familyToMembers.entries()) {
      const fam = families.find(f => f.family_id === famId);
      if (fam) {
        memIds.forEach(pId => personToFamily.set(pId, fam));
      }
    }

    const newResults = [];

    // 3. Evaluate Family-scope schemes
    const familySchemes = schemes.filter(s => s.scope === 'FAMILY');
    for (const family of families) {
      const memberPersonIds = familyToMembers.get(family.family_id) || [];
      const memberSet = new Set(memberPersonIds);
      const familySourceRecords = sourceRecords.filter(r => 
        (r.household_ref && r.household_ref === family.household_ref) ||
        (r.person_id && memberSet.has(r.person_id))
      );

      for (const scheme of familySchemes) {
        const evalRes = evaluateSchemeEligibility(
          scheme,
          family,
          family,
          familySourceRecords,
          openConflicts
        );

        newResults.push({
          id: crypto.randomUUID(),
          scheme_code: scheme.scheme_code,
          subject_type: 'FAMILY',
          subject_id: family.family_id,
          family_id: family.family_id,
          status: evalRes.status,
          reasons: evalRes.reasons,
          missing_information: evalRes.missing_information,
          outreach_status: 'NONE',
          evaluated_at: new Date().toISOString()
        });
      }
    }

    // 4. Evaluate Individual-scope schemes
    const individualSchemes = schemes.filter(s => s.scope === 'INDIVIDUAL');
    for (const person of persons) {
      const personFamily = personToFamily.get(person.person_id) || null;
      const personSourceRecords = sourceRecords.filter(r => r.person_id === person.person_id);

      for (const scheme of individualSchemes) {
        const evalRes = evaluateSchemeEligibility(
          scheme,
          person,
          personFamily,
          personSourceRecords,
          openConflicts
        );

        newResults.push({
          id: crypto.randomUUID(),
          scheme_code: scheme.scheme_code,
          subject_type: 'PERSON',
          subject_id: person.person_id,
          family_id: personFamily?.family_id || null,
          status: evalRes.status,
          reasons: evalRes.reasons,
          missing_information: evalRes.missing_information,
          outreach_status: 'NONE',
          evaluated_at: new Date().toISOString()
        });
      }
    }

    // 5. Update memoryStore (merge by scheme_code, subject_type, subject_id)
    const existingMap = new Map();
    memoryStore.eligibilityResults.forEach(r => {
      existingMap.set(`${r.scheme_code}_${r.subject_type}_${r.subject_id}`, r);
    });

    for (const res of newResults) {
      const key = `${res.scheme_code}_${res.subject_type}_${res.subject_id}`;
      const existing = existingMap.get(key);
      if (existing) {
        res.id = existing.id;
        res.outreach_status = existing.outreach_status || 'NONE';
      }
      existingMap.set(key, res);
    }

    memoryStore.eligibilityResults = Array.from(existingMap.values());

    // 6. Persist to Supabase if available
    if (isSupabaseConfigured) {
      try {
        if (memoryStore.eligibilityResults.length > 0) {
          await supabase.from('eligibility_result').upsert(
            memoryStore.eligibilityResults,
            { onConflict: 'scheme_code,subject_type,subject_id' }
          );
        }
      } catch (err) {
        console.warn('Supabase evaluateAll persistence error:', err.message);
      }
    }

    return memoryStore.eligibilityResults;
  },

  /**
   * Get eligibility results matching filters
   */
  async getEligibilityResults({ familyId = null, subjectId = null, schemeCode = null } = {}) {
    let results = [...memoryStore.eligibilityResults];

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('eligibility_result').select('*');
        if (familyId) query = query.eq('family_id', familyId);
        if (subjectId) query = query.eq('subject_id', subjectId);
        if (schemeCode) query = query.eq('scheme_code', schemeCode);

        const { data, error } = await query;
        if (!error && data) {
          const map = new Map();
          results.forEach(r => map.set(`${r.scheme_code}_${r.subject_type}_${r.subject_id}`, r));
          data.forEach(r => map.set(`${r.scheme_code}_${r.subject_type}_${r.subject_id}`, r));
          results = Array.from(map.values());
        }
      } catch (err) {
        console.warn('Supabase fetch eligibilityResults error:', err.message);
      }
    }

    if (familyId) results = results.filter(r => r.family_id === familyId);
    if (subjectId) results = results.filter(r => r.subject_id === subjectId);
    if (schemeCode) results = results.filter(r => r.scheme_code === schemeCode);

    return results;
  },

  /**
   * Get enrollments matching filters
   */
  async getEnrollments({ familyId = null, subjectId = null, schemeCode = null } = {}) {
    let enrollments = [...memoryStore.enrollments];

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('enrollment').select('*');
        if (familyId) query = query.eq('family_id', familyId);
        if (subjectId) query = query.eq('subject_id', subjectId);
        if (schemeCode) query = query.eq('scheme_code', schemeCode);

        const { data, error } = await query;
        if (!error && data) {
          const map = new Map();
          enrollments.forEach(e => map.set(e.enrollment_id, e));
          data.forEach(e => map.set(e.enrollment_id, e));
          enrollments = Array.from(map.values());
        }
      } catch (err) {
        console.warn('Supabase fetch enrollments error:', err.message);
      }
    }

    if (familyId) enrollments = enrollments.filter(e => e.family_id === familyId);
    if (subjectId) enrollments = enrollments.filter(e => e.subject_id === subjectId);
    if (schemeCode) enrollments = enrollments.filter(e => e.scheme_code === schemeCode);

    return enrollments;
  },

  /**
   * Get applications matching filters
   */
  async getApplications({ familyId = null, subjectId = null, schemeCode = null } = {}) {
    let applications = [...memoryStore.applications];

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('application').select('*');
        if (familyId) query = query.eq('family_id', familyId);
        if (subjectId) query = query.eq('subject_id', subjectId);
        if (schemeCode) query = query.eq('scheme_code', schemeCode);

        const { data, error } = await query;
        if (!error && data) {
          const map = new Map();
          applications.forEach(a => map.set(a.application_id, a));
          data.forEach(a => map.set(a.application_id, a));
          applications = Array.from(map.values());
        }
      } catch (err) {
        console.warn('Supabase fetch applications error:', err.message);
      }
    }

    if (familyId) applications = applications.filter(a => a.family_id === familyId);
    if (subjectId) applications = applications.filter(a => a.subject_id === subjectId);
    if (schemeCode) applications = applications.filter(a => a.scheme_code === schemeCode);

    return applications;
  },

  /**
   * Get all benefit gaps across Gujarat, with optional district or scheme filter
   */
  async getBenefitGaps({ district = null, schemeCode = null } = {}) {
    const eligibilityResults = await this.getEligibilityResults();
    const enrollments = await this.getEnrollments();
    const applications = await this.getApplications();
    const schemes = await this.getSchemes();
    const families = await familyService.getRawFamilies();
    const persons = await personService.getPersons();

    let gaps = findBenefitGaps(
      eligibilityResults,
      enrollments,
      applications,
      schemes,
      families,
      persons
    );

    if (district && district !== 'ALL') {
      gaps = gaps.filter(g => g.district.toLowerCase() === district.toLowerCase());
    }

    if (schemeCode && schemeCode !== 'ALL') {
      gaps = gaps.filter(g => g.scheme_code === schemeCode);
    }

    return gaps;
  },

  /**
   * Initiate outreach for a benefit gap (§11)
   */
  async initiateOutreach(resultId, actorRole = 'Officer', actorName = 'Field Officer') {
    let result = memoryStore.eligibilityResults.find(r => r.id === resultId);
    
    if (result) {
      result.outreach_status = 'NOTIFIED';
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('eligibility_result')
          .update({ outreach_status: 'NOTIFIED' })
          .eq('id', resultId);
      } catch (err) {
        console.warn('Supabase initiateOutreach error:', err.message);
      }
    }

    await auditService.log({
      actor_role: actorRole,
      actor_name: actorName,
      action: 'OUTREACH_INITIATED',
      entity_type: 'ELIGIBILITY_RESULT',
      entity_id: resultId,
      details: {
        scheme_code: result?.scheme_code,
        subject_id: result?.subject_id,
        family_id: result?.family_id
      }
    });

    return { success: true, outreach_status: 'NOTIFIED' };
  },

  /**
   * Generates Benefit Matrix model for a family profile
   */
  async getFamilyBenefitMatrix(familyId) {
    const familyProfile = await familyService.getFamilyById(familyId);
    if (!familyProfile) return null;

    const memberPersonIds = (familyProfile.members || []).map(m => m.person_id);
    const memberSet = new Set(memberPersonIds);

    const schemes = await this.getSchemes();
    const allEligibility = await this.getEligibilityResults();
    const eligibilityResults = allEligibility.filter(r => r.family_id === familyId || memberSet.has(r.subject_id) || r.subject_id === familyId);

    const allEnrollments = await this.getEnrollments();
    const enrollments = allEnrollments.filter(e => e.family_id === familyId || memberSet.has(e.subject_id) || e.subject_id === familyId);

    const allApps = await this.getApplications();
    const applications = allApps.filter(a => a.family_id === familyId || memberSet.has(a.subject_id) || a.subject_id === familyId);

    return buildBenefitMatrix(
      familyProfile,
      familyProfile.members,
      schemes,
      eligibilityResults,
      enrollments,
      applications
    );
  }
};
