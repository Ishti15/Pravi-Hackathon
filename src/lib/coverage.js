// Pure Scheme Coverage & Renewals Due Calculations (§11, §15)

/**
 * Calculates coverage metrics per scheme:
 * - enrolled: count of active enrollments
 * - gaps: count of eligible subjects with no enrollment and no in-flight application
 * - in_progress: count of in-flight applications or external referrals
 * - needs_verification: count of potentially eligible subjects with missing info
 * - coverage_pct = enrolled / (enrolled + gaps) * 100 (0 if denominator is 0)
 * 
 * @param {Object} params
 * @param {Array} params.schemes
 * @param {Array} params.enrollments
 * @param {Array} params.gaps
 * @param {Array} params.applications
 * @param {Array} params.eligibilityResults
 * @param {string} params.districtFilter - Optional district filter ('ALL' or specific district name)
 * @param {Map|Object} params.subjectDistrictMap - Map of subject_id -> district
 */
export function calculateSchemeCoverage({
  schemes = [],
  enrollments = [],
  gaps = [],
  applications = [],
  eligibilityResults = [],
  districtFilter = 'ALL',
  subjectDistrictMap = new Map()
}) {
  const isAllDistricts = !districtFilter || districtFilter === 'ALL';

  const filterByDistrict = (subjectId) => {
    if (isAllDistricts) return true;
    const dist = subjectDistrictMap instanceof Map 
      ? subjectDistrictMap.get(subjectId) 
      : subjectDistrictMap[subjectId];
    return dist && dist.toLowerCase() === districtFilter.toLowerCase();
  };

  const activeEnrollments = enrollments.filter(e => 
    ['ENROLLED', 'BENEFIT_DELIVERED', 'ACTIVE', 'RENEWAL_DUE'].includes(e.status) &&
    filterByDistrict(e.subject_id || e.family_id)
  );

  const filteredGaps = gaps.filter(g => 
    filterByDistrict(g.subject_id || g.family_id)
  );

  const inFlightApps = applications.filter(a =>
    ['STARTED', 'SUBMITTED', 'UNDER_VERIFICATION', 'REFERRED'].includes(a.status) &&
    filterByDistrict(a.subject_id || a.family_id)
  );

  const potentialEvals = eligibilityResults.filter(r =>
    r.status === 'POTENTIALLY_ELIGIBLE' &&
    filterByDistrict(r.subject_id || r.family_id)
  );

  return schemes.map(scheme => {
    const code = scheme.scheme_code;

    const schemeEnrollments = activeEnrollments.filter(e => e.scheme_code === code);
    const schemeGaps = filteredGaps.filter(g => g.scheme_code === code);
    const schemeInFlight = inFlightApps.filter(a => a.scheme_code === code);
    const schemePotential = potentialEvals.filter(r => r.scheme_code === code);

    const enrolledCount = schemeEnrollments.length;
    const gapsCount = schemeGaps.length;
    const inFlightCount = schemeInFlight.length;
    const potentialCount = schemePotential.length;

    const denominator = enrolledCount + gapsCount;
    const coveragePct = denominator > 0 
      ? Math.round((enrolledCount / denominator) * 1000) / 10 
      : 0;

    return {
      scheme_code: code,
      name: scheme.name,
      department: scheme.department,
      scope: scheme.scope,
      enrolled: enrolledCount,
      gaps: gapsCount,
      in_progress: inFlightCount,
      needs_verification: potentialCount,
      coverage_pct: coveragePct
    };
  });
}

/**
 * Finds enrollments where next_renewal_date is within windowDays from referenceDate (§11)
 * 
 * @param {Array} enrollments
 * @param {Date|string} referenceDate
 * @param {number} windowDays
 */
export function findRenewalsDue(enrollments = [], referenceDate = new Date('2024-10-01'), windowDays = 30) {
  const refTime = new Date(referenceDate).getTime();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  return enrollments
    .filter(e => {
      if (!e.next_renewal_date) return false;
      const renewalTime = new Date(e.next_renewal_date).getTime();
      if (isNaN(renewalTime)) return false;
      const diff = renewalTime - refTime;
      // Due if expiring within windowDays (or already overdue)
      return diff <= windowMs && ['ENROLLED', 'ACTIVE', 'RENEWAL_DUE', 'BENEFIT_DELIVERED'].includes(e.status);
    })
    .map(e => {
      const renewalTime = new Date(e.next_renewal_date).getTime();
      const daysRemaining = Math.ceil((renewalTime - refTime) / (24 * 60 * 60 * 1000));
      return {
        ...e,
        days_remaining: daysRemaining,
        is_overdue: daysRemaining < 0
      };
    })
    .sort((a, b) => a.days_remaining - b.days_remaining);
}
