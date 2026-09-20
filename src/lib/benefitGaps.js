// Pure Benefit Gap Identification Logic (§11)
import { deriveApplicationRoute } from './applicationRoute';

const ACTIVE_ENROLLMENT_STATUSES = new Set(['ENROLLED', 'BENEFIT_DELIVERED', 'ACTIVE']);
const IN_FLIGHT_APPLICATION_STATUSES = new Set(['STARTED', 'SUBMITTED', 'UNDER_VERIFICATION', 'REFERRED']);

/**
 * Finds all benefit gaps where a person or family is ELIGIBLE but not enrolled
 * and has no application currently in flight.
 * 
 * @param {Array} eligibilityResults - All eligibility results
 * @param {Array} enrollments - All enrollments
 * @param {Array} applications - All applications
 * @param {Array} schemes - Scheme definitions
 * @param {Array} families - Family registry entries
 * @param {Array} persons - Person registry entries
 */
export function findBenefitGaps(
  eligibilityResults = [],
  enrollments = [],
  applications = [],
  schemes = [],
  families = [],
  persons = []
) {
  const schemeMap = new Map(schemes.map(s => [s.scheme_code, s]));
  const familyMap = new Map(families.map(f => [f.family_id, f]));
  const personMap = new Map(persons.map(p => [p.person_id, p]));

  // Index active enrollments by `${subject_id}_${scheme_code}`
  const activeEnrollmentKeys = new Set(
    enrollments
      .filter(e => ACTIVE_ENROLLMENT_STATUSES.has(e.status))
      .map(e => `${e.subject_id}_${e.scheme_code}`)
  );

  // Index in-flight applications by `${subject_id}_${scheme_code}`
  const inFlightAppKeys = new Set(
    applications
      .filter(a => IN_FLIGHT_APPLICATION_STATUSES.has(a.status))
      .map(a => `${a.subject_id}_${a.scheme_code}`)
  );

  const gaps = [];

  for (const res of eligibilityResults) {
    if (res.status !== 'ELIGIBLE') continue;

    const key = `${res.subject_id}_${res.scheme_code}`;
    if (activeEnrollmentKeys.has(key)) continue;
    if (inFlightAppKeys.has(key)) continue;

    const scheme = schemeMap.get(res.scheme_code);
    const family = res.family_id ? familyMap.get(res.family_id) : null;
    const person = res.subject_type === 'PERSON' ? personMap.get(res.subject_id) : null;

    let subjectName = '';
    let district = family?.district || '';

    if (res.subject_type === 'PERSON') {
      subjectName = person?.canonical_name || `Person ${res.subject_id}`;
    } else {
      subjectName = family?.head_name ? `${family.head_name}'s Family` : `Family ${res.subject_id}`;
    }

    const routeInfo = scheme
      ? deriveApplicationRoute(scheme, res.status, res.missing_information)
      : null;

    gaps.push({
      gap_id: `GAP-${res.id || `${res.subject_id}-${res.scheme_code}`}`,
      eligibility_id: res.id,
      scheme_code: res.scheme_code,
      scheme_name: scheme?.name || res.scheme_code,
      department: scheme?.department || 'Government of Gujarat',
      scope: scheme?.scope || (res.subject_type === 'FAMILY' ? 'FAMILY' : 'INDIVIDUAL'),
      subject_type: res.subject_type,
      subject_id: res.subject_id,
      subject_name: subjectName,
      family_id: res.family_id || (res.subject_type === 'FAMILY' ? res.subject_id : null),
      district: district || 'Gandhinagar',
      reasons: res.reasons || [],
      missing_information: res.missing_information || [],
      outreach_status: res.outreach_status || 'NONE',
      route: routeInfo?.route || 'APPLY_HERE',
      route_label: routeInfo?.label || 'Application Available Here',
      official_url: routeInfo?.officialUrl || null,
      evaluated_at: res.evaluated_at || new Date().toISOString()
    });
  }

  return gaps;
}
