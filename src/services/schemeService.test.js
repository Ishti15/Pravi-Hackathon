import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { schemeService } from './schemeService';
import { familyService } from './familyService';
import { personService } from './personService';
import { ingestionService } from './ingestionService';
import { demoService } from './demoService';
import { auditService } from './auditService';
import { APPLICATION_ROUTES } from '../lib/applicationRoute';
import { MATRIX_CELL_STATES } from '../lib/benefitMatrix';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sampleDataDir = path.join(__dirname, '../../public/sample-data');

describe('Task 7 — Schemes, Eligibility, Benefit Gaps & Benefit Matrix (§10, §11)', () => {
  beforeEach(async () => {
    await demoService.resetDemoData();
  }, 60000);

  it('should evaluate eligibility, gaps, application routes, and matrix for Patel hero family (S1)', async () => {
    // 1. Ingest all 5 department CSVs
    const files = [
      { file: 'health.csv', dept: 'Health' },
      { file: 'education.csv', dept: 'Education' },
      { file: 'food.csv', dept: 'Food & Civil Supplies' },
      { file: 'labour.csv', dept: 'Labour' },
      { file: 'housing.csv', dept: 'Housing' }
    ];

    for (const f of files) {
      const csv = fs.readFileSync(path.join(sampleDataDir, f.file), 'utf8');
      await ingestionService.ingestCSV({ csvText: csv, department: f.dept, fileName: f.file });
    }

    // 2. Approve S3 review for Ramesh P Patel so the Patel family forms complete with 4 members
    const pendingReviews = await personService.getMatchReviews('PENDING');
    const s3Review = pendingReviews.find(r => r.candidate_person_id === 'P000001' || r.candidatePersonId === 'P000001');
    expect(s3Review).toBeDefined();

    await personService.approveMatchReview(
      s3Review.review_id,
      'Officer',
      'Test Officer',
      'Approved S3 match'
    );

    // 3. Ensure evaluation ran
    await schemeService.evaluateAll();

    // 4. Locate Patel family
    const families = await familyService.getFamilies();
    const patelFamily = families.find(f => f.household_ref === 'GJ-RC-100001');
    expect(patelFamily).toBeDefined();
    expect(patelFamily.members.length).toBe(4);

    const fullProfile = await familyService.getFamilyById(patelFamily.family_id);
    const rahul = fullProfile.members.find(m => m.canonical_name?.includes('Rahul'));
    const priya = fullProfile.members.find(m => m.canonical_name?.includes('Priya'));
    const ramesh = fullProfile.members.find(m => m.relationship === 'HEAD');

    expect(rahul).toBeDefined();
    expect(priya).toBeDefined();
    expect(ramesh).toBeDefined();

    // 5. Test Rahul STU-EDU: ELIGIBLE + GAP, route APPLY_HERE
    const rahulResults = await schemeService.getEligibilityResults({ subjectId: rahul.person_id, schemeCode: 'STU-EDU' });
    expect(rahulResults.length).toBe(1);
    const rahulEdu = rahulResults[0];
    expect(rahulEdu.status).toBe('ELIGIBLE');
    expect(rahulEdu.reasons.length).toBeGreaterThan(0);

    const allGaps = await schemeService.getBenefitGaps();
    const rahulGap = allGaps.find(g => g.subject_id === rahul.person_id && g.scheme_code === 'STU-EDU');
    expect(rahulGap).toBeDefined();
    expect(rahulGap.route).toBe(APPLICATION_ROUTES.APPLY_HERE);

    // 6. Test Priya GIRL-CHILD: ELIGIBLE, route ADDITIONAL_INFO_REQUIRED (bank last 4 digits + birth certificate)
    const priyaResults = await schemeService.getEligibilityResults({ subjectId: priya.person_id, schemeCode: 'GIRL-CHILD' });
    expect(priyaResults.length).toBe(1);
    const priyaGirl = priyaResults[0];
    expect(priyaGirl.status).toBe('ELIGIBLE');
    expect(priyaGirl.reasons.length).toBeGreaterThan(0);

    const priyaGirlGap = allGaps.find(g => g.subject_id === priya.person_id && g.scheme_code === 'GIRL-CHILD');
    expect(priyaGirlGap).toBeDefined();
    expect(priyaGirlGap.route).toBe(APPLICATION_ROUTES.ADDITIONAL_INFO_REQUIRED);

    const girlScheme = await schemeService.getSchemeByCode('GIRL-CHILD');
    expect(girlScheme.required_information.some(i => i.key === 'bank_account_last4')).toBe(true);
    expect(girlScheme.required_documents.some(d => d.key === 'birth_certificate')).toBe(true);

    // 7. Test Priya STU-EDU: Enrolled via department flag (no gap)
    const priyaEduResults = await schemeService.getEligibilityResults({ subjectId: priya.person_id, schemeCode: 'STU-EDU' });
    expect(priyaEduResults[0].status).toBe('ELIGIBLE');

    const priyaEnrollments = await schemeService.getEnrollments({ subjectId: priya.person_id, schemeCode: 'STU-EDU' });
    expect(priyaEnrollments.length).toBeGreaterThanOrEqual(1);
    expect(priyaEnrollments[0].status).toBe('ENROLLED');
    expect(priyaEnrollments[0].source).toBe('DEPARTMENT_RECORD');
    expect(priyaEnrollments[0].source_department).toBe('Education');

    // Priya must NOT appear as a gap for STU-EDU
    const priyaEduGap = allGaps.find(g => g.subject_id === priya.person_id && g.scheme_code === 'STU-EDU');
    expect(priyaEduGap).toBeUndefined();

    // 8. Test Patel Family HOUSING: ELIGIBLE, route EXTERNAL_PORTAL with URL and required documents
    const patelHousingResults = await schemeService.getEligibilityResults({ subjectId: patelFamily.family_id, schemeCode: 'HOUSING' });
    expect(patelHousingResults.length).toBe(1);
    const patelHousing = patelHousingResults[0];
    expect(patelHousing.status).toBe('ELIGIBLE');

    const housingGap = allGaps.find(g => g.subject_id === patelFamily.family_id && g.scheme_code === 'HOUSING');
    expect(housingGap).toBeDefined();
    expect(housingGap.route).toBe(APPLICATION_ROUTES.EXTERNAL_PORTAL);
    expect(housingGap.official_url).toBe('https://example.org/official-portal/housing');

    const housingScheme = await schemeService.getSchemeByCode('HOUSING');
    expect(housingScheme.required_documents.length).toBeGreaterThan(0);

    // 9. Test Hero Family Health Cover gap
    const healthGap = allGaps.find(g => g.subject_id === patelFamily.family_id && g.scheme_code === 'FAM-HEALTH');
    expect(healthGap).toBeDefined();
    expect(healthGap.route).toBe(APPLICATION_ROUTES.APPLY_HERE);

    // 10. Test NOT_ELIGIBLE has route NONE
    const rameshEduResults = await schemeService.getEligibilityResults({ subjectId: ramesh.person_id, schemeCode: 'STU-EDU' });
    expect(rameshEduResults.length).toBe(1);
    expect(rameshEduResults[0].status).toBe('NOT_ELIGIBLE');
    expect(rameshEduResults[0].reasons.length).toBeGreaterThan(0);

    const rameshGap = allGaps.find(g => g.subject_id === ramesh.person_id && g.scheme_code === 'STU-EDU');
    expect(rameshGap).toBeUndefined();

    // 11. Test Benefit Matrix renders correct cell states for the Patel family
    const matrix = await schemeService.getFamilyBenefitMatrix(patelFamily.family_id);
    expect(matrix).toBeDefined();
    expect(matrix.rows.length).toBe(5); // Family row + 4 member rows
    expect(matrix.columns.length).toBe(6); // 6 schemes

    const cells = matrix.cells;

    // Family row checks
    expect(cells[`${patelFamily.family_id}_FAM-HEALTH`].state).toBe(MATRIX_CELL_STATES.GAP);
    expect(cells[`${patelFamily.family_id}_HOUSING`].state).toBe(MATRIX_CELL_STATES.GAP);
    expect(cells[`${patelFamily.family_id}_STU-EDU`].state).toBe(MATRIX_CELL_STATES.NA);

    // Member checks
    expect(cells[`${rahul.person_id}_STU-EDU`].state).toBe(MATRIX_CELL_STATES.GAP);
    expect(cells[`${priya.person_id}_STU-EDU`].state).toBe(MATRIX_CELL_STATES.ENROLLED);
    expect(cells[`${priya.person_id}_GIRL-CHILD`].state).toBe(MATRIX_CELL_STATES.GAP);
    expect(cells[`${rahul.person_id}_GIRL-CHILD`].state).toBe(MATRIX_CELL_STATES.NOT_ELIGIBLE);
    expect(cells[`${ramesh.person_id}_FAM-HEALTH`].state).toBe(MATRIX_CELL_STATES.NA);

    // Every cell with evaluation has reasons
    expect(cells[`${rahul.person_id}_STU-EDU`].reasons.length).toBeGreaterThan(0);
    expect(cells[`${priya.person_id}_GIRL-CHILD`].reasons.length).toBeGreaterThan(0);
  }, 90000);

  it('should evaluate S10 family with missing income as POTENTIALLY_ELIGIBLE with missing info', async () => {
    // Ingest food.csv (which contains S10 FOOD-0009 Manilal Baranda with blank income)
    const foodCSV = fs.readFileSync(path.join(sampleDataDir, 'food.csv'), 'utf8');
    await ingestionService.ingestCSV({ csvText: foodCSV, department: 'Food & Civil Supplies', fileName: 'food.csv' });

    await schemeService.evaluateAll();

    // Locate Baranda family (GJ-RC-100003)
    const families = await familyService.getFamilies();
    const barandaFamily = families.find(f => f.household_ref === 'GJ-RC-100003');
    expect(barandaFamily).toBeDefined();

    // Evaluate FAM-HEALTH for Baranda family
    const results = await schemeService.getEligibilityResults({ subjectId: barandaFamily.family_id, schemeCode: 'FAM-HEALTH' });
    expect(results.length).toBe(1);

    const famHealth = results[0];
    expect(famHealth.status).toBe('POTENTIALLY_ELIGIBLE');
    expect(famHealth.missing_information.length).toBeGreaterThan(0);
    expect(famHealth.missing_information.some(m => m.toLowerCase().includes('income'))).toBe(true);
  }, 90000);

  it('should initiate outreach for a benefit gap and log OUTREACH_INITIATED audit event', async () => {
    // Ingest education.csv and health.csv
    const healthCSV = fs.readFileSync(path.join(sampleDataDir, 'health.csv'), 'utf8');
    await ingestionService.ingestCSV({ csvText: healthCSV, department: 'Health', fileName: 'health.csv' });

    const foodCSV = fs.readFileSync(path.join(sampleDataDir, 'food.csv'), 'utf8');
    await ingestionService.ingestCSV({ csvText: foodCSV, department: 'Food & Civil Supplies', fileName: 'food.csv' });

    // Approve S3
    const pendingReviews = await personService.getMatchReviews('PENDING');
    if (pendingReviews.length > 0) {
      await personService.approveMatchReview(pendingReviews[0].review_id, 'Officer', 'Officer Patel', 'Approved');
    }

    await schemeService.evaluateAll();

    const gaps = await schemeService.getBenefitGaps();
    expect(gaps.length).toBeGreaterThan(0);

    const firstGap = gaps[0];
    const outreachRes = await schemeService.initiateOutreach(firstGap.eligibility_id, 'Officer', 'Field Officer Patel');
    expect(outreachRes.success).toBe(true);
    expect(outreachRes.outreach_status).toBe('NOTIFIED');

    // Verify audit log entry
    const logs = await auditService.getLogs();
    const outreachLog = logs.find(l => l.action === 'OUTREACH_INITIATED');
    expect(outreachLog).toBeDefined();
    expect(outreachLog.actor_name).toBe('Field Officer Patel');
  }, 90000);
});
