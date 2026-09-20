import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeName, normalizeAddress } from './normalize';
import { namesMatch, addressesMatch, tokensMatch } from './similarity';
import { evaluateRecordLink, MATCH_METHODS, MATCH_STRENGTHS } from './linking';
import { ingestionService } from '../services/ingestionService';
import { demoService } from '../services/demoService';
import { personService } from '../services/personService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDataDir = path.join(__dirname, '../../public/sample-data');

describe('Task 4 — Normalization & Rule-Based Record Linking (§8)', () => {
  beforeEach(async () => {
    await demoService.resetDemoData();
  }, 25000);

  describe('Name & Address Normalization', () => {
    it('normalizes Gujarati honorifics and suffixes correctly', () => {
      expect(normalizeName('Shri Rameshbhai Patel').normalized).toBe('ramesh patel');
      expect(normalizeName('Smt. Meenaben R Patel').normalized).toBe('meena r patel');
      expect(normalizeName('Mr. Dineshkumar Solanki').normalized).toBe('dinesh solanki');
      expect(normalizeName('Rahul Patel').normalized).toBe('rahul patel');
    });

    it('extracts non-trivial address tokens while stripping common stopwords', () => {
      const addr = normalizeAddress('12 Shivam Society, Opp. Bus Stand, Kalol');
      expect(addr.tokens).toContain('12');
      expect(addr.tokens).toContain('shivam');
      expect(addr.tokens).toContain('kalol');
      expect(addr.tokens).not.toContain('society');
      expect(addr.tokens).not.toContain('opp');
    });
  });

  describe('Similarity & Matching Logic', () => {
    it('handles token equality, initials, and edit distance <= 1', () => {
      expect(tokensMatch('ramesh', 'ramesh')).toBe(true);
      expect(tokensMatch('p', 'patel')).toBe(true);
      expect(tokensMatch('patel', 'patal')).toBe(true); // edit distance 1 (substitution)
      expect(tokensMatch('patel', 'patl')).toBe(true);  // edit distance 1 (deletion)
      expect(tokensMatch('ramesh', 'suresh')).toBe(false);
    });

    it('matches names with initial variations and Gujarati suffixes', () => {
      const res1 = namesMatch('Rameshbhai Patel', 'Ramesh Patel');
      expect(res1.match).toBe(true);

      const res2 = namesMatch('Ramesh P Patel', 'Rameshbhai Patel');
      expect(res2.match).toBe(true);

      const res3 = namesMatch('Meenaben Patel', 'Meena Patel');
      expect(res3.match).toBe(true);

      const res4 = namesMatch('Ramesh Patel', 'Suresh Patel');
      expect(res4.match).toBe(false);
    });

    it('matches addresses in same district with shared tokens or same village', () => {
      const match1 = addressesMatch('12 Shivam Society, Kalol', 'Gandhinagar', 'Shivam Soc, Kalol', 'Gandhinagar');
      expect(match1.match).toBe(true);

      const match2 = addressesMatch('12 Shivam Society, Kalol', 'Gandhinagar', '45 Old Wada, Sabarmati', 'Ahmedabad');
      expect(match2.match).toBe(false);
      expect(match2.reason).toContain('Districts differ');
    });
  });

  describe('Scenario S2: Direct Auto-Linking', () => {
    it('auto-links records with same DOB, gender, normalized name, and matching address', () => {
      const heroPerson = {
        person_id: 'P000001',
        canonical_name: 'Rameshbhai Patel',
        dob: '1980-05-12',
        gender: 'M',
        identity_status: 'UNVERIFIED',
        identity_reference: null
      };

      const heroSourceRecords = [
        {
          source_record_id: 'sr-1',
          person_id: 'P000001',
          source_person_name: 'Rameshbhai Patel',
          source_dob: '1980-05-12',
          source_gender: 'M',
          source_address: '12 Shivam Society, Kalol',
          district: 'Gandhinagar'
        }
      ];

      const incomingLabour = {
        source_record_id: 'sr-2',
        source_key: 'LAB-0001',
        source_person_name: 'Ramesh Patel',
        source_dob: '1980-05-12',
        source_gender: 'M',
        source_address: '12 Shivam Society, Kalol',
        district: 'Gandhinagar',
        source_identifier: null
      };

      const result = evaluateRecordLink(incomingLabour, [heroPerson], heroSourceRecords);
      expect(result.decision).toBe(MATCH_METHODS.AUTO_LINK);
      expect(result.candidatePersonId).toBe('P000001');
      expect(result.strength).toBe(MATCH_STRENGTHS.HIGH);
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
      expect(result.reasons.some(r => r.includes('Matching DOB'))).toBe(true);
    });
  });

  describe('Scenario S3: Ambiguous Match to Review Queue', () => {
    it('places matching name and DOB with different address into PENDING_REVIEW', () => {
      const heroPerson = {
        person_id: 'P000001',
        canonical_name: 'Rameshbhai Patel',
        dob: '1980-05-12',
        gender: 'M'
      };

      const heroSourceRecords = [
        {
          source_record_id: 'sr-1',
          person_id: 'P000001',
          source_person_name: 'Rameshbhai Patel',
          source_dob: '1980-05-12',
          source_gender: 'M',
          source_address: '12 Shivam Society, Kalol',
          district: 'Gandhinagar'
        }
      ];

      const incomingFood = {
        source_record_id: 'sr-3',
        source_key: 'FOOD-0001',
        source_person_name: 'Ramesh P Patel',
        source_dob: '1980-05-12',
        source_gender: 'M',
        source_address: '45 Old Wada, Sabarmati',
        district: 'Ahmedabad',
        source_identifier: null
      };

      const result = evaluateRecordLink(incomingFood, [heroPerson], heroSourceRecords);
      expect(result.decision).toBe(MATCH_METHODS.PENDING_REVIEW);
      expect(result.candidatePersonId).toBe('P000001');
      expect(result.strength).toBe(MATCH_STRENGTHS.MEDIUM);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('Districts differ') || r.includes('Address differs'))).toBe(true);
    });
  });

  describe('Scenario S4: Identity Trap (Never Linked to Hero)', () => {
    it('creates NEW_PERSON for different person with same name but different DOB & district', () => {
      const heroPerson = {
        person_id: 'P000001',
        canonical_name: 'Rameshbhai Patel',
        dob: '1980-05-12',
        gender: 'M'
      };

      const trapMehsana = {
        source_record_id: 'sr-4',
        source_key: 'HLT-0005',
        source_person_name: 'Ramesh Patel',
        source_dob: '1975-11-02',
        source_gender: 'M',
        source_address: '7 Gayatri Nagar',
        district: 'Mehsana',
        source_identifier: null
      };

      const result = evaluateRecordLink(trapMehsana, [heroPerson], []);
      expect(result.decision).toBe(MATCH_METHODS.NEW_PERSON);
      expect(result.candidatePersonId).toBeNull();
      expect(result.strength).toBeNull();
      expect(result.reasons).toContain('No existing person with matching DOB and gender');
    });
  });

  describe('Scenario S5: Identity Reference Linking', () => {
    it('links records immediately via matching synthetic identity reference', () => {
      const meenaPerson = {
        person_id: 'P000002',
        canonical_name: 'Meena Patel',
        dob: '1984-09-03',
        gender: 'F',
        identity_reference: 'SYN-ID-000002',
        identity_status: 'VERIFIED'
      };

      const incomingFoodMeena = {
        source_record_id: 'sr-5',
        source_key: 'FOOD-0002',
        source_person_name: 'Meenaben R Patel',
        source_dob: '1984-09-03',
        source_gender: 'F',
        source_address: '45 Old Wada, Sabarmati',
        district: 'Ahmedabad',
        source_identifier: 'SYN-ID-000002'
      };

      const result = evaluateRecordLink(incomingFoodMeena, [meenaPerson], []);
      expect(result.decision).toBe(MATCH_METHODS.VERIFIED_ID);
      expect(result.candidatePersonId).toBe('P000002');
      expect(result.strength).toBe(MATCH_STRENGTHS.VERIFIED);
      expect(result.reasons.some(r => r.includes('SYN-ID-000002'))).toBe(true);
    });
  });

  describe('Scenario S6: Missing DOB Handling', () => {
    it('never auto-links record with missing DOB and flags MISSING_DOB', () => {
      const existingPersons = [
        {
          person_id: 'P000001',
          canonical_name: 'Jignesh Vaghela',
          dob: '1990-01-01',
          gender: 'M'
        }
      ];

      const missingDobRecord = {
        source_record_id: 'sr-6',
        source_key: 'HLT-0006',
        source_person_name: 'Jignesh Vaghela',
        source_dob: null,
        source_gender: 'M',
        source_address: 'Sector 21',
        district: 'Gandhinagar',
        source_identifier: null
      };

      const result = evaluateRecordLink(missingDobRecord, existingPersons, []);
      expect(result.decision).toBe(MATCH_METHODS.NEW_PERSON);
      expect(result.candidatePersonId).toBeNull();
      expect(result.dataFlags).toContain('MISSING_DOB');
      expect(result.reasons.some(r => r.includes('MISSING_DOB'))).toBe(true);
    });
  });

  describe('End-to-End Batch Ingestion & Linking across 5 CSVs', () => {
    it('processes all 5 CSVs with linking, review queueing, and person creation', async () => {
      const files = [
        { name: 'health.csv', dept: 'Health' },
        { name: 'education.csv', dept: 'Education' },
        { name: 'food.csv', dept: 'Food & Civil Supplies' },
        { name: 'labour.csv', dept: 'Labour' },
        { name: 'housing.csv', dept: 'Housing' }
      ];

      let totalLinked = 0;
      let totalReviewQueued = 0;
      let totalNewPersons = 0;

      for (const f of files) {
        const csvText = fs.readFileSync(path.join(sampleDataDir, f.name), 'utf8');
        const res = await ingestionService.ingestCSV({
          csvText,
          department: f.dept,
          fileName: f.name
        });

        totalLinked += res.batch.linked_records;
        totalReviewQueued += res.batch.review_queued;
        totalNewPersons += res.batch.new_persons;
      }

      // We should have created persons, linked records across files, and queued review for S3
      const persons = await personService.getPersons();
      expect(persons.length).toBeGreaterThanOrEqual(50);
      expect(totalLinked).toBeGreaterThan(0);
      expect(totalReviewQueued).toBeGreaterThan(0);
      expect(totalNewPersons).toBe(persons.length);

      // Verify pending match review queue has S3 (FOOD-0001 Ramesh P Patel)
      const pendingReviews = await personService.getMatchReviews('PENDING');
      expect(pendingReviews.length).toBeGreaterThanOrEqual(1);
      const s3Review = pendingReviews.find(r => r.reasons && r.reasons.some(reason => reason.includes('Ahmedabad') || reason.includes('Kalol') || reason.includes('Districts differ')));
      expect(s3Review).toBeDefined();
      expect(s3Review.strength).toBe(MATCH_STRENGTHS.MEDIUM);
    }, 30000);
  });
});
