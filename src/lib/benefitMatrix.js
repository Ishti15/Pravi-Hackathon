// Pure Benefit Matrix Builder Logic (§11)
import { deriveApplicationRoute } from './applicationRoute';

export const MATRIX_CELL_STATES = {
  ENROLLED: 'ENROLLED',
  RENEWAL_DUE: 'RENEWAL_DUE',
  IN_PROGRESS: 'IN_PROGRESS',
  GAP: 'GAP',
  POTENTIAL: 'POTENTIAL',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  NA: 'N/A'
};

const ACTIVE_ENROLLMENT_STATUSES = new Set(['ENROLLED', 'BENEFIT_DELIVERED', 'ACTIVE']);
const IN_FLIGHT_APPLICATION_STATUSES = new Set(['STARTED', 'SUBMITTED', 'UNDER_VERIFICATION', 'REFERRED']);

/**
 * Builds the Family Benefit Matrix grid model.
 * 
 * @param {Object} family - Family profile
 * @param {Array} members - Family members with person details
 * @param {Array} schemes - Scheme definitions
 * @param {Array} eligibilityResults - Eligibility results
 * @param {Array} enrollments - Enrollments
 * @param {Array} applications - Applications
 */
export function buildBenefitMatrix(
  family,
  members = [],
  schemes = [],
  eligibilityResults = [],
  enrollments = [],
  applications = []
) {
  if (!family) {
    return { rows: [], columns: [], cells: {} };
  }

  // Define columns (6 schemes in logical order: Education, Girl Child, Health, Food, Housing, Labour)
  const preferredOrder = ['STU-EDU', 'GIRL-CHILD', 'FAM-HEALTH', 'FOOD-SEC', 'HOUSING', 'LABOUR-WELFARE'];
  const sortedSchemes = [...schemes].sort((a, b) => {
    const idxA = preferredOrder.indexOf(a.scheme_code);
    const idxB = preferredOrder.indexOf(b.scheme_code);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.scheme_code.localeCompare(b.scheme_code);
  });

  const columns = sortedSchemes.map(s => ({
    scheme_code: s.scheme_code,
    name: s.name,
    department: s.department,
    scope: s.scope,
    application_mode: s.application_mode,
    official_application_url: s.official_application_url,
    benefit_description: s.benefit_description
  }));

  // Define rows:
  // Row 0: Family Unit
  // Rows 1..N: Individual family members (Head first, then spouse, children, others)
  const relPriority = { HEAD: 1, SPOUSE: 2, SON: 3, DAUGHTER: 4, PARENT: 5, OTHER: 6 };
  const sortedMembers = [...members].sort((a, b) => {
    const pA = relPriority[a.relationship] || 99;
    const pB = relPriority[b.relationship] || 99;
    return pA - pB;
  });

  const rows = [
    {
      id: family.family_id,
      name: 'Family (Household)',
      type: 'FAMILY',
      relationship: 'HOUSEHOLD',
      isFamilyRow: true,
      age: null,
      gender: null
    },
    ...sortedMembers.map(m => ({
      id: m.person_id,
      name: m.person?.canonical_name || m.name || m.person_id,
      type: 'PERSON',
      relationship: m.relationship,
      isFamilyRow: false,
      age: m.person?.dob ? m.person.dob : null,
      gender: m.person?.gender || null
    }))
  ];

  // Map indexes
  const cellMap = {}; // key: `${rowId}_${schemeCode}`

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  for (const row of rows) {
    for (const col of columns) {
      const cellKey = `${row.id}_${col.scheme_code}`;

      // Check scope compatibility
      if (row.isFamilyRow && col.scope !== 'FAMILY') {
        cellMap[cellKey] = {
          state: MATRIX_CELL_STATES.NA,
          label: 'N/A (Individual Scheme)',
          badgeColor: 'gray',
          rowId: row.id,
          schemeCode: col.scheme_code,
          reasons: ['This scheme is evaluated for individual members, not the household unit.'],
          missingInfo: [],
          routeInfo: null
        };
        continue;
      }

      if (!row.isFamilyRow && col.scope !== 'INDIVIDUAL') {
        cellMap[cellKey] = {
          state: MATRIX_CELL_STATES.NA,
          label: 'N/A (Family Scheme)',
          badgeColor: 'gray',
          rowId: row.id,
          schemeCode: col.scheme_code,
          reasons: ['This scheme is evaluated at the household level on the Family row.'],
          missingInfo: [],
          routeInfo: null
        };
        continue;
      }

      // Scope matches!
      const activeEnrollment = enrollments.find(
        e => e.subject_id === row.id && e.scheme_code === col.scheme_code && ACTIVE_ENROLLMENT_STATUSES.has(e.status)
      );

      const inFlightApp = applications.find(
        a => a.subject_id === row.id && a.scheme_code === col.scheme_code && IN_FLIGHT_APPLICATION_STATUSES.has(a.status)
      );

      const eligibility = eligibilityResults.find(
        r => r.subject_id === row.id && r.scheme_code === col.scheme_code
      );

      const schemeObj = schemes.find(s => s.scheme_code === col.scheme_code);
      const routeInfo = schemeObj
        ? deriveApplicationRoute(schemeObj, eligibility?.status || 'NOT_ELIGIBLE', eligibility?.missing_information || [])
        : null;

      // 1. Enrollment check
      if (activeEnrollment) {
        let isRenewalDue = false;
        if (activeEnrollment.next_renewal_date) {
          const renewalTime = new Date(activeEnrollment.next_renewal_date).getTime();
          if (renewalTime - now <= thirtyDaysMs) {
            isRenewalDue = true;
          }
        }

        if (isRenewalDue) {
          cellMap[cellKey] = {
            state: MATRIX_CELL_STATES.RENEWAL_DUE,
            label: 'Renewal Due',
            badgeColor: 'amber',
            rowId: row.id,
            schemeCode: col.scheme_code,
            enrollment: activeEnrollment,
            reasons: [`Enrolled via ${activeEnrollment.source_department || activeEnrollment.source}`, `Renewal required by ${activeEnrollment.next_renewal_date}`],
            missingInfo: [],
            routeInfo
          };
        } else {
          cellMap[cellKey] = {
            state: MATRIX_CELL_STATES.ENROLLED,
            label: 'Enrolled',
            badgeColor: 'emerald',
            rowId: row.id,
            schemeCode: col.scheme_code,
            enrollment: activeEnrollment,
            reasons: [`Enrolled via ${activeEnrollment.source_department || activeEnrollment.source || 'Official Application'}`],
            missingInfo: [],
            routeInfo
          };
        }
        continue;
      }

      // 2. In-Flight Application check
      if (inFlightApp) {
        const isReferred = inFlightApp.status === 'REFERRED';
        cellMap[cellKey] = {
          state: MATRIX_CELL_STATES.IN_PROGRESS,
          label: isReferred ? 'Referred (Official Portal)' : 'In Progress',
          badgeColor: 'blue',
          rowId: row.id,
          schemeCode: col.scheme_code,
          application: inFlightApp,
          reasons: [isReferred ? 'Referred to official government portal for completion.' : `Application currently in status: ${inFlightApp.status}`],
          missingInfo: [],
          routeInfo
        };
        continue;
      }

      // 3. Eligibility check
      const eligStatus = eligibility?.status || 'NOT_ELIGIBLE';
      const reasons = eligibility?.reasons || [];
      const missingInfo = eligibility?.missing_information || [];

      if (eligStatus === 'ELIGIBLE') {
        cellMap[cellKey] = {
          state: MATRIX_CELL_STATES.GAP,
          label: 'Benefit Gap',
          badgeColor: 'amber',
          rowId: row.id,
          schemeCode: col.scheme_code,
          eligibility,
          reasons: reasons.length > 0 ? reasons : ['Meets all eligibility criteria but not currently enrolled.'],
          missingInfo,
          routeInfo
        };
      } else if (eligStatus === 'POTENTIALLY_ELIGIBLE') {
        cellMap[cellKey] = {
          state: MATRIX_CELL_STATES.POTENTIAL,
          label: 'Potentially Eligible',
          badgeColor: 'indigo',
          rowId: row.id,
          schemeCode: col.scheme_code,
          eligibility,
          reasons,
          missingInfo,
          routeInfo
        };
      } else {
        cellMap[cellKey] = {
          state: MATRIX_CELL_STATES.NOT_ELIGIBLE,
          label: 'Not Eligible',
          badgeColor: 'rose',
          rowId: row.id,
          schemeCode: col.scheme_code,
          eligibility,
          reasons: reasons.length > 0 ? reasons : ['Does not meet eligibility criteria.'],
          missingInfo,
          routeInfo
        };
      }
    }
  }

  return {
    family,
    rows,
    columns,
    cells: cellMap
  };
}
