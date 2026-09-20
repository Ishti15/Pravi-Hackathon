import { describe, it, expect } from 'vitest';
import {
  APPLICATION_STATUSES,
  ENROLLMENT_STATUSES,
  validateTransition,
  checkDuplicateApplication,
  checkRequirementsCompletion,
  calculateRenewalDate
} from './applicationFlow';

describe('Task 8 — Pure Application Flow & State Machine (§12)', () => {
  const sampleScheme = {
    scheme_code: 'GIRL-CHILD',
    scope: 'INDIVIDUAL',
    application_mode: 'INTERNAL',
    required_information: [
      { key: 'bank_account_last4', label: 'Bank Account (Last 4 Digits)' }
    ],
    required_documents: [
      { key: 'birth_certificate', label: 'Birth Certificate' }
    ],
    renewal_months: 12
  };

  describe('validateTransition', () => {
    it('allows Citizen to transition STARTED -> SUBMITTED when requirements are complete', () => {
      const res = validateTransition({
        currentStatus: APPLICATION_STATUSES.STARTED,
        nextStatus: APPLICATION_STATUSES.SUBMITTED,
        actorRole: 'Citizen',
        hasMissingRequirements: false
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeNull();
    });

    it('rejects Citizen transition STARTED -> SUBMITTED when requirements are missing', () => {
      const res = validateTransition({
        currentStatus: APPLICATION_STATUSES.STARTED,
        nextStatus: APPLICATION_STATUSES.SUBMITTED,
        actorRole: 'Citizen',
        hasMissingRequirements: true
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/missing/i);
    });

    it('allows Officer transitions SUBMITTED -> UNDER_VERIFICATION and UNDER_VERIFICATION -> APPROVED', () => {
      const step1 = validateTransition({
        currentStatus: APPLICATION_STATUSES.SUBMITTED,
        nextStatus: APPLICATION_STATUSES.UNDER_VERIFICATION,
        actorRole: 'Officer'
      });
      expect(step1.valid).toBe(true);

      const step2 = validateTransition({
        currentStatus: APPLICATION_STATUSES.UNDER_VERIFICATION,
        nextStatus: APPLICATION_STATUSES.APPROVED,
        actorRole: 'Officer'
      });
      expect(step2.valid).toBe(true);
    });

    it('requires a note when Officer rejects an application', () => {
      const withoutNote = validateTransition({
        currentStatus: APPLICATION_STATUSES.UNDER_VERIFICATION,
        nextStatus: APPLICATION_STATUSES.REJECTED,
        actorRole: 'Officer',
        note: ''
      });
      expect(withoutNote.valid).toBe(false);
      expect(withoutNote.error).toMatch(/note/i);

      const withNote = validateTransition({
        currentStatus: APPLICATION_STATUSES.UNDER_VERIFICATION,
        nextStatus: APPLICATION_STATUSES.REJECTED,
        actorRole: 'Officer',
        note: 'Income exceeded certified threshold'
      });
      expect(withNote.valid).toBe(true);
    });

    it('blocks illegal status skips (e.g. STARTED -> APPROVED)', () => {
      const res = validateTransition({
        currentStatus: APPLICATION_STATUSES.STARTED,
        nextStatus: APPLICATION_STATUSES.APPROVED,
        actorRole: 'Officer'
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/invalid transition/i);
    });
  });

  describe('checkDuplicateApplication', () => {
    it('detects existing active enrollment and returns formatted message (S11/S12)', () => {
      const existingEnrollments = [
        {
          scheme_code: 'STU-EDU',
          subject_id: 'P000004',
          status: ENROLLMENT_STATUSES.ENROLLED,
          source_department: 'Education',
          enrolled_at: '2024-04-01'
        }
      ];

      const res = checkDuplicateApplication(
        existingEnrollments,
        [],
        { scheme_code: 'STU-EDU', scope: 'INDIVIDUAL' },
        'P000004'
      );

      expect(res.isDuplicate).toBe(true);
      expect(res.reason).toBe('ALREADY_ENROLLED');
      expect(res.message).toMatch(/Already enrolled via Education/);
    });

    it('detects in-flight application and prevents duplicate submission', () => {
      const existingApps = [
        {
          scheme_code: 'GIRL-CHILD',
          subject_id: 'P000004',
          status: APPLICATION_STATUSES.SUBMITTED
        }
      ];

      const res = checkDuplicateApplication(
        [],
        existingApps,
        sampleScheme,
        'P000004'
      );

      expect(res.isDuplicate).toBe(true);
      expect(res.reason).toBe('IN_FLIGHT_APPLICATION');
      expect(res.message).toMatch(/already in progress/i);
    });

    it('permits application when no enrollment and no in-flight application exist', () => {
      const res = checkDuplicateApplication([], [], sampleScheme, 'P000004');
      expect(res.isDuplicate).toBe(false);
      expect(res.message).toBeNull();
    });
  });

  describe('checkRequirementsCompletion', () => {
    it('detects missing information and missing documents in Route B', () => {
      const emptyCheck = checkRequirementsCompletion(sampleScheme, {}, []);
      expect(emptyCheck.isComplete).toBe(false);
      expect(emptyCheck.missingInfo).toContain('Bank Account (Last 4 Digits)');
      expect(emptyCheck.missingDocs).toContain('Birth Certificate');

      const partialCheck = checkRequirementsCompletion(
        sampleScheme,
        { bank_account_last4: '1234' },
        []
      );
      expect(partialCheck.isComplete).toBe(false);
      expect(partialCheck.missingDocs.length).toBe(1);

      const fullCheck = checkRequirementsCompletion(
        sampleScheme,
        { bank_account_last4: '1234' },
        [{ doc_type: 'birth_certificate', file_name: 'cert.pdf' }]
      );
      expect(fullCheck.isComplete).toBe(true);
      expect(fullCheck.missingInfo.length).toBe(0);
      expect(fullCheck.missingDocs.length).toBe(0);
    });
  });

  describe('calculateRenewalDate', () => {
    it('correctly adds renewal months to reference date', () => {
      const renewal = calculateRenewalDate('2024-01-15', 12);
      expect(renewal).toBe('2025-01-15');
    });
  });
});
