import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { personService } from './personService';
import { ingestionService } from './ingestionService';
import { demoService } from './demoService';
import { auditService } from './auditService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDataDir = path.join(__dirname, '../../public/sample-data');

describe('Task 5 — Officer Review of Ambiguous Links (§8)', () => {
  beforeEach(async () => {
    await demoService.resetDemoData();
  }, 25000);

  it('should list pending match reviews and approve S3 ambiguous link', async () => {
    // 1. Ingest health.csv (creates Hero Patel P000001)
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

    // 3. Fetch pending reviews with details
    const pendingReviews = await personService.getMatchReviewsWithDetails('PENDING');
    expect(pendingReviews.length).toBeGreaterThanOrEqual(1);

    const s3Review = pendingReviews.find(r => r.sourceRecord?.source_key === 'FOOD-0001');
    expect(s3Review).toBeDefined();
    expect(s3Review.candidatePerson?.canonical_name).toBe('Rameshbhai Patel');
    expect(s3Review.strength).toBe('MEDIUM');
    expect(s3Review.sourceRecord?.source_person_name).toBe('Ramesh P Patel');
    expect(s3Review.sourceRecord?.source_address).toBe('45 Old Wada, Sabarmati');

    // 4. Officer approves the ambiguous match
    const approveResult = await personService.approveMatchReview(
      s3Review.review_id,
      'Officer',
      'Test Officer',
      'Verified address change from Sabarmati to Kalol'
    );

    expect(approveResult.review.status).toBe('APPROVED');
    expect(approveResult.review.reviewed_by).toBe('Test Officer');

    // 5. Verify source record is linked to candidate person with OFFICER_APPROVED
    const heroPersonId = s3Review.candidate_person_id;
    const { sourceRecords } = await personService.getPersonById(heroPersonId);
    const linkedFoodRecord = sourceRecords.find(r => r.source_key === 'FOOD-0001');
    expect(linkedFoodRecord).toBeDefined();
    expect(linkedFoodRecord.person_id).toBe(heroPersonId);
    expect(linkedFoodRecord.match_method).toBe('OFFICER_APPROVED');

    // 6. Verify source_* fields remain completely unmodified
    expect(linkedFoodRecord.source_person_name).toBe('Ramesh P Patel');
    expect(linkedFoodRecord.source_address).toBe('45 Old Wada, Sabarmati');
    expect(linkedFoodRecord.district).toBe('Ahmedabad');

    // 7. Verify review is cleared from PENDING queue
    const remainingPending = await personService.getMatchReviews('PENDING');
    const stillPending = remainingPending.find(r => r.review_id === s3Review.review_id);
    expect(stillPending).toBeUndefined();

    // 8. Verify audit log entry
    const logs = await auditService.getLogs();
    const approveLog = logs.find(l => l.action === 'IDENTITY_MATCH_APPROVED' && l.entity_id === s3Review.review_id);
    expect(approveLog).toBeDefined();
    expect(approveLog.details.linked_person_id).toBe(heroPersonId);
  }, 35000);

  it('should reject ambiguous match and create a new distinct person', async () => {
    // 1. Ingest health.csv & food.csv
    const healthCSV = fs.readFileSync(path.join(sampleDataDir, 'health.csv'), 'utf8');
    await ingestionService.ingestCSV({
      csvText: healthCSV,
      department: 'Health',
      fileName: 'health.csv'
    });

    const foodCSV = fs.readFileSync(path.join(sampleDataDir, 'food.csv'), 'utf8');
    await ingestionService.ingestCSV({
      csvText: foodCSV,
      department: 'Food & Civil Supplies',
      fileName: 'food.csv'
    });

    const pendingReviews = await personService.getMatchReviewsWithDetails('PENDING');
    const reviewToReject = pendingReviews[0];
    expect(reviewToReject).toBeDefined();

    // 2. Reject match
    const rejectResult = await personService.rejectMatchReview(
      reviewToReject.review_id,
      'Officer',
      'Test Officer',
      'Different person based on field verification'
    );

    expect(rejectResult.review.status).toBe('REJECTED');
    expect(rejectResult.newPerson).toBeDefined();
    expect(rejectResult.newPerson.person_id).not.toBe(reviewToReject.candidate_person_id);

    // 3. Verify audit log entry
    const logs = await auditService.getLogs();
    const rejectLog = logs.find(l => l.action === 'IDENTITY_MATCH_REJECTED' && l.entity_id === reviewToReject.review_id);
    expect(rejectLog).toBeDefined();
  }, 35000);
});
