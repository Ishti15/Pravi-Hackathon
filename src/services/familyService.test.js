import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { familyService } from './familyService';
import { ingestionService } from './ingestionService';
import { personService } from './personService';
import { demoService } from './demoService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDataDir = path.join(__dirname, '../../public/sample-data');

describe('Task 6 — Families and Family ID (§9)', () => {
  beforeEach(async () => {
    await demoService.resetDemoData();
  }, 25000);

  it('should hold back Patel family while S3 is pending, and form 4-member family after S3 approval', async () => {
    // 1. Ingest health.csv (Hero family members: Ramesh, Meena, Rahul, Priya)
    const healthCSV = fs.readFileSync(path.join(sampleDataDir, 'health.csv'), 'utf8');
    await ingestionService.ingestCSV({
      csvText: healthCSV,
      department: 'Health',
      fileName: 'health.csv'
    });

    // 2. Ingest food.csv (contains S3 FOOD-0001 Ramesh P Patel with Sabarmati address -> PENDING_REVIEW)
    const foodCSV = fs.readFileSync(path.join(sampleDataDir, 'food.csv'), 'utf8');
    await ingestionService.ingestCSV({
      csvText: foodCSV,
      department: 'Food & Civil Supplies',
      fileName: 'food.csv'
    });

    // Verify Patel family household (GJ-RC-100001) is held back because FOOD-0001 is pending review
    const initialFamilies = await familyService.getFamilies();
    const patelInitial = initialFamilies.find(f => f.household_ref === 'GJ-RC-100001');
    expect(patelInitial).toBeUndefined();

    // 3. Officer reviews and approves S3 match
    const pendingReviews = await personService.getMatchReviews('PENDING');
    const s3Review = pendingReviews.find(r => r.candidate_person_id === 'P000001' || r.candidatePersonId === 'P000001');
    expect(s3Review).toBeDefined();

    await personService.approveMatchReview(
      s3Review.review_id,
      'Officer',
      'Test Officer',
      'Approved S3 match'
    );

    // 4. Verify Patel family now exists in the registry
    const familiesAfterApproval = await familyService.getFamilies();
    const patelFamily = familiesAfterApproval.find(f => f.household_ref === 'GJ-RC-100001');
    expect(patelFamily).toBeDefined();

    // Verify Family ID format FAM-GJ-######
    expect(patelFamily.family_id).toMatch(/^FAM-GJ-\d{6}$/);

    // 5. Fetch full family profile and verify exactly 4 members
    const fullProfile = await familyService.getFamilyById(patelFamily.family_id);
    expect(fullProfile).toBeDefined();
    expect(fullProfile.members.length).toBe(4);

    // Verify member relationships
    const head = fullProfile.members.find(m => m.relationship === 'HEAD');
    expect(head).toBeDefined();
    expect(head.person_id).toBe('P000001');

    const spouse = fullProfile.members.find(m => m.relationship === 'SPOUSE');
    expect(spouse).toBeDefined();

    const son = fullProfile.members.find(m => m.relationship === 'SON');
    expect(son).toBeDefined();

    const daughter = fullProfile.members.find(m => m.relationship === 'DAUGHTER');
    expect(daughter).toBeDefined();

    // Verify provenance for head includes linked records
    expect(head.source_records.length).toBeGreaterThanOrEqual(2);
  }, 35000);

  it('should be idempotent: re-running reconcileFamilies creates no duplicates', async () => {
    // Ingest education, food, labour
    const files = ['health.csv', 'education.csv', 'food.csv'];
    for (const f of files) {
      const csv = fs.readFileSync(path.join(sampleDataDir, f), 'utf8');
      const dept = f.includes('health') ? 'Health' : f.includes('edu') ? 'Education' : 'Food & Civil Supplies';
      await ingestionService.ingestCSV({ csvText: csv, department: dept, fileName: f });
    }

    const firstRun = await familyService.getFamilies();
    const firstCount = firstRun.length;
    expect(firstCount).toBeGreaterThan(0);

    // Run reconciliation again
    await familyService.reconcileFamilies();
    const secondRun = await familyService.getFamilies();
    expect(secondRun.length).toBe(firstCount);

    // Family IDs should match exactly
    const firstIds = firstRun.map(f => f.family_id).sort();
    const secondIds = secondRun.map(f => f.family_id).sort();
    expect(firstIds).toEqual(secondIds);
  }, 35000);

  it('should list unassigned persons who lack a household reference', async () => {
    // Ingest labour.csv which has Paresh Makwana (LAB-0003, Surat, no ration card)
    const labourCSV = fs.readFileSync(path.join(sampleDataDir, 'labour.csv'), 'utf8');
    await ingestionService.ingestCSV({
      csvText: labourCSV,
      department: 'Labour',
      fileName: 'labour.csv'
    });

    const unassigned = await familyService.getUnassignedPersons();
    expect(unassigned.length).toBeGreaterThanOrEqual(1);

    const paresh = unassigned.find(p => p.canonical_name.includes('Paresh'));
    expect(paresh).toBeDefined();
    expect(paresh.district).toBe('Surat');
  }, 35000);
});
