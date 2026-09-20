// Pure Application Workflow & State Machine Logic (§12)

export const APPLICATION_STATUSES = {
  STARTED: 'STARTED',
  SUBMITTED: 'SUBMITTED',
  UNDER_VERIFICATION: 'UNDER_VERIFICATION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REFERRED: 'REFERRED'
};

export const ENROLLMENT_STATUSES = {
  ENROLLED: 'ENROLLED',
  BENEFIT_DELIVERED: 'BENEFIT_DELIVERED',
  ACTIVE: 'ACTIVE',
  RENEWAL_DUE: 'RENEWAL_DUE',
  TERMINATED: 'TERMINATED'
};

// In-flight application statuses that block new applications and remove benefit gaps
export const IN_FLIGHT_APPLICATION_STATUSES = new Set([
  APPLICATION_STATUSES.STARTED,
  APPLICATION_STATUSES.SUBMITTED,
  APPLICATION_STATUSES.UNDER_VERIFICATION,
  APPLICATION_STATUSES.REFERRED
]);

export const ACTIVE_ENROLLMENT_STATUSES = new Set([
  ENROLLMENT_STATUSES.ENROLLED,
  ENROLLMENT_STATUSES.BENEFIT_DELIVERED,
  ENROLLMENT_STATUSES.ACTIVE,
  ENROLLMENT_STATUSES.RENEWAL_DUE
]);

/**
 * Allowed status transitions and actor permissions:
 * - Citizen: create (STARTED), STARTED -> SUBMITTED (only when nothing is missing)
 * - Officer: SUBMITTED -> UNDER_VERIFICATION, UNDER_VERIFICATION -> APPROVED / REJECTED (rejection requires note)
 * - External referral ends at REFERRED
 */
export const ALLOWED_TRANSITIONS = {
  [APPLICATION_STATUSES.STARTED]: [APPLICATION_STATUSES.SUBMITTED],
  [APPLICATION_STATUSES.SUBMITTED]: [APPLICATION_STATUSES.UNDER_VERIFICATION],
  [APPLICATION_STATUSES.UNDER_VERIFICATION]: [APPLICATION_STATUSES.APPROVED, APPLICATION_STATUSES.REJECTED],
  [APPLICATION_STATUSES.APPROVED]: [],
  [APPLICATION_STATUSES.REJECTED]: [],
  [APPLICATION_STATUSES.REFERRED]: []
};

/**
 * Validates a requested status transition
 * 
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @param {string} actorRole - 'Citizen', 'Officer', 'Admin'
 * @param {string} note - Required for REJECTED
 * @param {boolean} hasMissingRequirements - For STARTED -> SUBMITTED check
 */
export function validateTransition({
  currentStatus,
  nextStatus,
  actorRole = 'Citizen',
  note = '',
  hasMissingRequirements = false
}) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      error: `Invalid transition from "${currentStatus}" to "${nextStatus}".`
    };
  }

  // Citizen-specific checks
  if (actorRole === 'Citizen') {
    if (nextStatus !== APPLICATION_STATUSES.SUBMITTED) {
      return {
        valid: false,
        error: `Citizens can only submit draft applications.`
      };
    }
    if (hasMissingRequirements) {
      return {
        valid: false,
        error: `Cannot submit application while required information or documents are missing.`
      };
    }
  }

  // Officer-specific checks
  if (actorRole === 'Officer' || actorRole === 'Admin') {
    if (nextStatus === APPLICATION_STATUSES.SUBMITTED) {
      return {
        valid: false,
        error: `Officers cannot revert or set status to SUBMITTED.`
      };
    }
    if (nextStatus === APPLICATION_STATUSES.REJECTED && (!note || !note.trim())) {
      return {
        valid: false,
        error: `Rejection requires an explanatory officer note.`
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Checks duplicate application and enrollment rules (§12)
 * 
 * - FAMILY scope: checks if family is enrolled or has in-flight application
 * - INDIVIDUAL scope: checks if person is enrolled or has in-flight application
 * 
 * @param {Array} existingEnrollments
 * @param {Array} existingApplications
 * @param {Object} scheme
 * @param {string} subjectId
 */
export function checkDuplicateApplication(existingEnrollments = [], existingApplications = [], scheme, subjectId) {
  if (!scheme || !subjectId) {
    return { isDuplicate: false, message: null, existing: null };
  }

  const schemeCode = scheme.scheme_code;

  // 1. Check existing active enrollment
  const existingEnrollment = existingEnrollments.find(e => 
    e.scheme_code === schemeCode &&
    e.subject_id === subjectId &&
    ACTIVE_ENROLLMENT_STATUSES.has(e.status)
  );

  if (existingEnrollment) {
    const sourceLabel = existingEnrollment.source_department || existingEnrollment.source || 'department record';
    const enrolledDate = existingEnrollment.enrolled_at 
      ? new Date(existingEnrollment.enrolled_at).toLocaleDateString('en-IN')
      : 'earlier records';

    return {
      isDuplicate: true,
      reason: 'ALREADY_ENROLLED',
      message: `Already enrolled via ${sourceLabel} on ${enrolledDate}`,
      existing: existingEnrollment
    };
  }

  // 2. Check existing in-flight application
  const inFlightApp = existingApplications.find(a =>
    a.scheme_code === schemeCode &&
    a.subject_id === subjectId &&
    IN_FLIGHT_APPLICATION_STATUSES.has(a.status)
  );

  if (inFlightApp) {
    return {
      isDuplicate: true,
      reason: 'IN_FLIGHT_APPLICATION',
      message: `An application is already in progress (${inFlightApp.status.replace(/_/g, ' ')})`,
      existing: inFlightApp
    };
  }

  return { isDuplicate: false, message: null, existing: null };
}

/**
 * Validates requirements checklist completion for submission
 * 
 * @param {Object} scheme
 * @param {Object} submittedData
 * @param {Array} attachedDocuments
 */
export function checkRequirementsCompletion(scheme, submittedData = {}, attachedDocuments = []) {
  const missingInfo = [];
  const missingDocs = [];

  const requiredInfo = scheme?.required_information || [];
  for (const info of requiredInfo) {
    const val = submittedData[info.key];
    if (val == null || (typeof val === 'string' && !val.trim())) {
      missingInfo.push(info.label || info.key);
    }
  }

  const requiredDocs = scheme?.required_documents || [];
  const attachedTypes = new Set(attachedDocuments.map(d => d.doc_type || d.key));
  for (const doc of requiredDocs) {
    if (!attachedTypes.has(doc.key)) {
      missingDocs.push(doc.label || doc.key);
    }
  }

  const isComplete = missingInfo.length === 0 && missingDocs.length === 0;

  return {
    isComplete,
    missingInfo,
    missingDocs
  };
}

/**
 * Calculates next renewal date based on renewal months
 * 
 * @param {Date|string} fromDate
 * @param {number} renewalMonths
 */
export function calculateRenewalDate(fromDate = new Date(), renewalMonths = 12) {
  const dt = new Date(fromDate);
  dt.setMonth(dt.getMonth() + Number(renewalMonths || 12));
  return dt.toISOString().split('T')[0];
}
