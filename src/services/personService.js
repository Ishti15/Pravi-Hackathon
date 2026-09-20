import { supabase, isSupabaseConfigured } from './supabaseClient';
import { memoryStore } from './dbStore';
import { auditService } from './auditService';
import { familyService } from './familyService';
import { schemeService } from './schemeService';

export const personService = {
  /**
   * Get all canonical persons
   */
  async getPersons() {
    const map = new Map();
    memoryStore.persons.forEach(p => map.set(p.person_id, p));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('person')
          .select('*')
          .order('person_id', { ascending: true });
        if (!error && data) {
          data.forEach(p => map.set(p.person_id, p));
        }
      } catch (err) {
        console.warn('Supabase fetch persons error:', err.message);
      }
    }

    return Array.from(map.values());
  },

  /**
   * Get person by person_id with linked source records
   */
  async getPersonById(personId) {
    let person = null;
    let sourceRecords = [];

    const allPersons = await this.getPersons();
    person = allPersons.find(p => p.person_id === personId) || null;

    const recordsMap = new Map();
    memoryStore.sourceRecords.filter(r => r.person_id === personId).forEach(r => recordsMap.set(r.source_record_id, r));

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('source_record')
          .select('*')
          .eq('person_id', personId);
        if (data) {
          data.forEach(r => recordsMap.set(r.source_record_id, r));
        }
      } catch (err) {
        console.warn('Supabase fetch personById error:', err.message);
      }
    }

    sourceRecords = Array.from(recordsMap.values());

    return {
      person,
      sourceRecords
    };
  },

  /**
   * Create or save new persons
   */
  async savePersons(personsList) {
    if (!personsList || personsList.length === 0) return;

    for (const p of personsList) {
      const idx = memoryStore.persons.findIndex(x => x.person_id === p.person_id);
      if (idx >= 0) {
        memoryStore.persons[idx] = { ...memoryStore.persons[idx], ...p };
      } else {
        memoryStore.persons.push(p);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('person').upsert(personsList);
      } catch (err) {
        console.warn('Supabase savePersons error:', err.message);
      }
    }
  },

  /**
   * Get match review items (e.g. status = 'PENDING')
   */
  async getMatchReviews(status = 'PENDING') {
    const map = new Map();
    memoryStore.matchReviews.forEach(r => map.set(r.review_id, r));

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('match_review').select('*');
        if (status) {
          query = query.eq('status', status);
        }
        const { data, error } = await query;
        if (!error && data) {
          data.forEach(r => map.set(r.review_id, r));
        }
      } catch (err) {
        console.warn('Supabase getMatchReviews error:', err.message);
      }
    }

    const all = Array.from(map.values());
    if (status) {
      return all.filter(r => r.status === status);
    }
    return all;
  },

  /**
   * Get match review items with full joined details (source record, candidate person, candidate source records)
   */
  async getMatchReviewsWithDetails(status = 'PENDING') {
    const reviews = await this.getMatchReviews(status);
    const allPersons = await this.getPersons();
    
    const recordsMap = new Map();
    memoryStore.sourceRecords.forEach(r => recordsMap.set(r.source_record_id, r));

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('source_record').select('*');
        if (data) {
          data.forEach(r => recordsMap.set(r.source_record_id, r));
        }
      } catch (err) {
        console.warn('Supabase fetch source_records in match reviews error:', err.message);
      }
    }
    const allRecords = Array.from(recordsMap.values());

    return reviews.map(rev => {
      const candidateId = rev.candidate_person_id || rev.candidatePersonId;
      const sourceRecordId = rev.source_record_id || rev.sourceRecordId;
      const sourceRecord = allRecords.find(r => r.source_record_id === sourceRecordId) || null;
      const candidatePerson = allPersons.find(p => p.person_id === candidateId) || null;
      const candidateSourceRecords = allRecords.filter(r => r.person_id === candidateId);

      return {
        ...rev,
        sourceRecord,
        candidatePerson,
        candidateSourceRecords
      };
    });
  },

  /**
   * Approve a pending match review -> links source record to candidate person
   */
  async approveMatchReview(reviewId, actorRole = 'Officer', actorName = 'Verification Officer', note = '') {
    let review = memoryStore.matchReviews.find(r => r.review_id === reviewId);
    if (!review && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('match_review').select('*').eq('review_id', reviewId).single();
        if (data) review = data;
      } catch (err) {
        console.warn('Supabase fetch review error:', err.message);
      }
    }

    if (!review) {
      throw new Error(`Match review ${reviewId} not found`);
    }

    review.status = 'APPROVED';
    review.reviewed_by = actorName;
    review.reviewed_at = new Date().toISOString();
    review.note = note;

    // Link source record to candidate person
    let sourceRec = memoryStore.sourceRecords.find(r => r.source_record_id === review.source_record_id);
    if (!sourceRec && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('source_record').select('*').eq('source_record_id', review.source_record_id).single();
        if (data) sourceRec = data;
      } catch (err) {
        console.warn('Supabase fetch source_record in approve error:', err.message);
      }
    }

    if (sourceRec) {
      sourceRec.person_id = review.candidate_person_id;
      sourceRec.match_method = 'OFFICER_APPROVED';
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('match_review')
          .update({
            status: 'APPROVED',
            reviewed_by: actorName,
            reviewed_at: review.reviewed_at,
            note
          })
          .eq('review_id', reviewId);

        if (sourceRec) {
          await supabase
            .from('source_record')
            .update({
              person_id: review.candidate_person_id,
              match_method: 'OFFICER_APPROVED'
            })
            .eq('source_record_id', review.source_record_id);
        }
      } catch (err) {
        console.warn('Supabase approveMatchReview error:', err.message);
      }
    }

    await auditService.log({
      actor_role: actorRole,
      actor_name: actorName,
      action: 'IDENTITY_MATCH_APPROVED',
      entity_type: 'MATCH_REVIEW',
      entity_id: reviewId,
      details: {
        source_record_id: review.source_record_id,
        linked_person_id: review.candidate_person_id,
        note
      }
    });

    try {
      await familyService.reconcileFamilies(actorRole, actorName);
    } catch (err) {
      console.warn('Post-approval family reconciliation error:', err.message);
    }

    try {
      await schemeService.evaluateAll(actorRole, actorName);
    } catch (err) {
      console.warn('Post-approval eligibility evaluation error:', err.message);
    }

    return { review, sourceRecord: sourceRec };
  },

  /**
   * Reject a pending match review -> creates a new distinct person for source record
   */
  async rejectMatchReview(reviewId, actorRole = 'Officer', actorName = 'Verification Officer', note = '') {
    let review = memoryStore.matchReviews.find(r => r.review_id === reviewId);
    if (!review && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('match_review').select('*').eq('review_id', reviewId).single();
        if (data) review = data;
      } catch (err) {
        console.warn('Supabase fetch review in reject error:', err.message);
      }
    }

    if (!review) {
      throw new Error(`Match review ${reviewId} not found`);
    }

    review.status = 'REJECTED';
    review.reviewed_by = actorName;
    review.reviewed_at = new Date().toISOString();
    review.note = note;

    let sourceRec = memoryStore.sourceRecords.find(r => r.source_record_id === review.source_record_id);
    if (!sourceRec && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('source_record').select('*').eq('source_record_id', review.source_record_id).single();
        if (data) sourceRec = data;
      } catch (err) {
        console.warn('Supabase fetch source_record in reject error:', err.message);
      }
    }

    let newPerson = null;

    if (sourceRec) {
      const newPersonId = memoryStore.getNextPersonId();
      newPerson = {
        person_id: newPersonId,
        canonical_name: sourceRec.source_person_name,
        dob: sourceRec.source_dob || null,
        gender: sourceRec.source_gender || null,
        occupation: sourceRec.attributes?.occupation || null,
        is_student: Boolean(sourceRec.attributes?.is_student),
        education_class: sourceRec.attributes?.class || null,
        identity_status: sourceRec.source_identifier ? 'VERIFIED' : 'UNVERIFIED',
        identity_reference: sourceRec.source_identifier || null,
        data_flags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      memoryStore.persons.push(newPerson);
      sourceRec.person_id = newPersonId;
      sourceRec.match_method = 'NEW_PERSON';

      if (isSupabaseConfigured) {
        try {
          await supabase.from('person').insert([newPerson]);
          await supabase
            .from('source_record')
            .update({
              person_id: newPersonId,
              match_method: 'NEW_PERSON'
            })
            .eq('source_record_id', review.source_record_id);
        } catch (err) {
          console.warn('Supabase rejectMatchReview person insertion error:', err.message);
        }
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('match_review')
          .update({
            status: 'REJECTED',
            reviewed_by: actorName,
            reviewed_at: review.reviewed_at,
            note
          })
          .eq('review_id', reviewId);
      } catch (err) {
        console.warn('Supabase rejectMatchReview error:', err.message);
      }
    }

    await auditService.log({
      actor_role: actorRole,
      actor_name: actorName,
      action: 'IDENTITY_MATCH_REJECTED',
      entity_type: 'MATCH_REVIEW',
      entity_id: reviewId,
      details: {
        source_record_id: review.source_record_id,
        created_person_id: newPerson?.person_id || null,
        note
      }
    });

    try {
      await familyService.reconcileFamilies(actorRole, actorName);
    } catch (err) {
      console.warn('Post-rejection family reconciliation error:', err.message);
    }

    try {
      await schemeService.evaluateAll(actorRole, actorName);
    } catch (err) {
      console.warn('Post-rejection eligibility evaluation error:', err.message);
    }

    return { review, newPerson, sourceRecord: sourceRec };
  }
};
