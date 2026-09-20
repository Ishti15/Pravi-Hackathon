import Papa from 'papaparse';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { memoryStore } from './dbStore';
import { auditService } from './auditService';
import { validateDepartmentRows } from '../lib/validation';
import { evaluateRecordLink, createPersonFromSourceRecord, MATCH_METHODS } from '../lib/linking';
import { familyService } from './familyService';
import { schemeService } from './schemeService';

export const ingestionService = {
  /**
   * Parse and ingest a department CSV
   */
  async ingestCSV({ csvText, department, fileName, actorRole = 'Administrator', actorName = 'Admin User' }) {
    // 1. Parse CSV
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false
    });

    if (parseResult.errors && parseResult.errors.length > 0 && (!parseResult.data || parseResult.data.length === 0)) {
      throw new Error(`CSV Parsing failed: ${parseResult.errors.map(e => e.message).join(', ')}`);
    }

    const rawRows = parseResult.data || [];
    const totalRows = rawRows.length;

    // 2. Fetch existing keys for idempotency
    const existingKeys = new Set();
    memoryStore.sourceRecords
      .filter(r => r.department === department)
      .forEach(r => existingKeys.add(r.source_key));

    if (isSupabaseConfigured) {
      try {
        const { data: existing } = await supabase
          .from('source_record')
          .select('source_key')
          .eq('department', department);
        if (existing) {
          existing.forEach(r => existingKeys.add(r.source_key));
        }
      } catch (err) {
        console.warn('Failed to fetch existing source_records from Supabase:', err.message);
      }
    }

    // 3. Validate rows
    const { validRows, errorRows, duplicatesInFile } = validateDepartmentRows(department, rawRows, existingKeys);

    // 4. Fetch existing persons and source records for linking
    let existingPersons = [...memoryStore.persons];
    let existingSourceRecords = [...memoryStore.sourceRecords];

    if (isSupabaseConfigured) {
      try {
        const { data: dbPersons } = await supabase.from('person').select('*');
        if (dbPersons && dbPersons.length > 0) {
          existingPersons = dbPersons;
        }
        const { data: dbRecords } = await supabase.from('source_record').select('*');
        if (dbRecords && dbRecords.length > 0) {
          existingSourceRecords = dbRecords;
        }
      } catch (err) {
        console.warn('Supabase fetch existing entities for linking error:', err.message);
      }
    }

    // 5. Create batch record
    const batchId = crypto.randomUUID();
    const batch = {
      batch_id: batchId,
      department,
      file_name: fileName,
      uploaded_at: new Date().toISOString(),
      total_rows: totalRows,
      imported_rows: validRows.length,
      error_rows: errorRows.length,
      errors: errorRows,
      linked_records: 0,
      review_queued: 0,
      new_persons: 0,
      duplicates_in_file: duplicatesInFile,
      conflicts_detected: 0
    };

    // 6. Process each valid row through linking pipeline
    const stagedSourceRecords = [];
    const newPersonsToInsert = [];
    const newReviewsToInsert = [];
    const personsToUpdate = [];

    for (const row of validRows) {
      const sourceRecordId = crypto.randomUUID();
      const tempRecord = {
        source_record_id: sourceRecordId,
        batch_id: batchId,
        department: row.department,
        source_key: row.source_key,
        source_person_name: row.source_person_name,
        source_dob: row.source_dob,
        source_gender: row.source_gender,
        source_address: row.source_address,
        district: row.district,
        source_identifier: row.source_identifier,
        household_ref: row.household_ref,
        relationship_to_head: row.relationship_to_head,
        father_or_spouse_name: row.father_or_spouse_name,
        attributes: row.attributes,
        raw: row.raw,
        created_at: new Date().toISOString()
      };

      const linkResult = evaluateRecordLink(tempRecord, existingPersons, existingSourceRecords);

      if (linkResult.decision === MATCH_METHODS.VERIFIED_ID || linkResult.decision === MATCH_METHODS.AUTO_LINK) {
        tempRecord.person_id = linkResult.candidatePersonId;
        tempRecord.match_method = linkResult.decision;
        tempRecord.match_strength = linkResult.strength;
        tempRecord.normalized_name = linkResult.normalizedName;
        batch.linked_records++;

        // Enrich candidate person if needed
        const candidate = existingPersons.find(p => p.person_id === linkResult.candidatePersonId);
        if (candidate) {
          let updated = false;
          if (!candidate.occupation && tempRecord.attributes?.occupation) {
            candidate.occupation = tempRecord.attributes.occupation;
            updated = true;
          }
          if (!candidate.is_student && tempRecord.attributes?.is_student) {
            candidate.is_student = true;
            candidate.education_class = tempRecord.attributes?.class || candidate.education_class;
            updated = true;
          }
          if (!candidate.identity_reference && tempRecord.source_identifier) {
            candidate.identity_reference = tempRecord.source_identifier;
            candidate.identity_status = 'VERIFIED';
            updated = true;
          }
          if (updated && !personsToUpdate.some(p => p.person_id === candidate.person_id)) {
            personsToUpdate.push(candidate);
          }
        }
      } else if (linkResult.decision === MATCH_METHODS.PENDING_REVIEW) {
        tempRecord.person_id = null;
        tempRecord.match_method = MATCH_METHODS.PENDING_REVIEW;
        tempRecord.match_strength = linkResult.strength;
        tempRecord.normalized_name = linkResult.normalizedName;
        batch.review_queued++;

        const reviewRecord = {
          review_id: crypto.randomUUID(),
          source_record_id: sourceRecordId,
          candidate_person_id: linkResult.candidatePersonId,
          strength: linkResult.strength,
          reasons: linkResult.reasons,
          status: 'PENDING',
          reviewed_by: null,
          reviewed_at: null,
          note: null
        };
        newReviewsToInsert.push(reviewRecord);
      } else {
        // NEW_PERSON
        const personId = memoryStore.getNextPersonId();
        const newPerson = createPersonFromSourceRecord(tempRecord, personId, linkResult.dataFlags);
        existingPersons.push(newPerson);
        newPersonsToInsert.push(newPerson);

        tempRecord.person_id = personId;
        tempRecord.match_method = MATCH_METHODS.NEW_PERSON;
        tempRecord.match_strength = null;
        tempRecord.normalized_name = linkResult.normalizedName;
        batch.new_persons++;
      }

      stagedSourceRecords.push(tempRecord);
      existingSourceRecords.push(tempRecord);
    }

    // 7. Update memoryStore
    memoryStore.ingestionBatches.unshift(batch);
    memoryStore.sourceRecords.push(...stagedSourceRecords);
    if (newPersonsToInsert.length > 0) {
      memoryStore.persons.push(...newPersonsToInsert);
    }
    if (newReviewsToInsert.length > 0) {
      memoryStore.matchReviews.push(...newReviewsToInsert);
    }

    // 8. Persist to Supabase if available
    if (isSupabaseConfigured) {
      try {
        await supabase.from('ingestion_batch').insert([batch]);
        if (newPersonsToInsert.length > 0) {
          await supabase.from('person').insert(newPersonsToInsert);
        }
        if (personsToUpdate.length > 0) {
          await supabase.from('person').upsert(personsToUpdate, { onConflict: 'person_id' });
        }
        if (stagedSourceRecords.length > 0) {
          await supabase.from('source_record').insert(stagedSourceRecords);
        }
        if (newReviewsToInsert.length > 0) {
          await supabase.from('match_review').insert(newReviewsToInsert);
        }
      } catch (err) {
        console.warn('Supabase ingestion persistence error:', err.message);
      }
    }

    // 9. Audit log
    await auditService.log({
      actor_role: actorRole,
      actor_name: actorName,
      action: 'DATA_INGESTED',
      entity_type: 'INGESTION_BATCH',
      entity_id: batchId,
      details: {
        department,
        file_name: fileName,
        total_rows: totalRows,
        imported_rows: validRows.length,
        error_rows: errorRows.length,
        linked_records: batch.linked_records,
        review_queued: batch.review_queued,
        new_persons: batch.new_persons,
        duplicates: duplicatesInFile
      }
    });

    // 10. Reconcile families
    try {
      await familyService.reconcileFamilies(actorRole, actorName);
    } catch (err) {
      console.warn('Post-ingestion family reconciliation error:', err.message);
    }

    // 11. Evaluate scheme eligibility
    try {
      await schemeService.evaluateAll(actorRole, actorName);
    } catch (err) {
      console.warn('Post-ingestion eligibility evaluation error:', err.message);
    }

    return {
      batch,
      sourceRecords: stagedSourceRecords,
      errors: errorRows
    };
  },

  /**
   * Load entire 5-CSV demo dataset sequentially
   */
  async loadDemoDataset(actorRole = 'Administrator', actorName = 'Admin User') {
    const demoFiles = [
      { file: 'health.csv', dept: 'Health' },
      { file: 'education.csv', dept: 'Education' },
      { file: 'food.csv', dept: 'Food & Civil Supplies' },
      { file: 'labour.csv', dept: 'Labour' },
      { file: 'housing.csv', dept: 'Housing' }
    ];

    const results = [];

    for (const item of demoFiles) {
      const response = await fetch(`/sample-data/${item.file}`);
      if (!response.ok) {
        throw new Error(`Failed to load /sample-data/${item.file}`);
      }
      const csvText = await response.text();
      const res = await this.ingestCSV({
        csvText,
        department: item.dept,
        fileName: item.file,
        actorRole,
        actorName
      });
      results.push(res);
    }

    return results;
  },

  /**
   * Get all ingestion batches
   */
  async getBatches() {
    const map = new Map();
    memoryStore.ingestionBatches.forEach(b => map.set(b.batch_id, b));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('ingestion_batch')
          .select('*')
          .order('uploaded_at', { ascending: false });
        if (!error && data) {
          data.forEach(b => map.set(b.batch_id, b));
        }
      } catch (err) {
        console.warn('Supabase fetch batches error, falling back to memoryStore:', err.message);
      }
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  },

  /**
   * Get staged source records
   */
  async getSourceRecords(department = null) {
    const map = new Map();
    memoryStore.sourceRecords.forEach(r => map.set(r.source_record_id, r));

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('source_record').select('*').order('created_at', { ascending: false }).limit(500);
        if (department) {
          query = query.eq('department', department);
        }
        const { data, error } = await query;
        if (!error && data) {
          data.forEach(r => map.set(r.source_record_id, r));
        }
      } catch (err) {
        console.warn('Supabase fetch source_records error:', err.message);
      }
    }

    const all = Array.from(map.values());
    if (department) {
      return all.filter(r => r.department === department);
    }
    return all;
  }
};
