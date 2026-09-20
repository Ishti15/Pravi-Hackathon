// Pure Application Route Derivation Logic (§10)

export const APPLICATION_ROUTES = {
  NONE: 'NONE',
  EXTERNAL_PORTAL: 'EXTERNAL_PORTAL',
  APPLY_HERE: 'APPLY_HERE',
  ADDITIONAL_INFO_REQUIRED: 'ADDITIONAL_INFO_REQUIRED'
};

export const ROUTE_LABELS = {
  NONE: 'Not Eligible',
  EXTERNAL_PORTAL: 'Apply on Official Portal',
  APPLY_HERE: 'Application Available Here',
  ADDITIONAL_INFO_REQUIRED: 'Additional Information Required'
};

/**
 * Derives the application route for a scheme given eligibility and required inputs/documents.
 * 
 * @param {Object} scheme - Scheme definition
 * @param {string} eligibilityStatus - 'ELIGIBLE' | 'POTENTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE'
 * @param {Array} missingInformation - Missing eligibility facts from evaluation
 * @param {Object} userProvidedData - Existing draft/provided input key-values
 * @param {Array} userProvidedDocs - Existing uploaded doc type keys
 */
export function deriveApplicationRoute(
  scheme,
  eligibilityStatus,
  missingInformation = [],
  userProvidedData = {},
  userProvidedDocs = []
) {
  if (eligibilityStatus === 'NOT_ELIGIBLE') {
    return {
      route: APPLICATION_ROUTES.NONE,
      label: ROUTE_LABELS.NONE,
      officialUrl: null,
      missingRequirements: [],
      requiredInfo: [],
      requiredDocs: []
    };
  }

  if (scheme.application_mode === 'EXTERNAL') {
    return {
      route: APPLICATION_ROUTES.EXTERNAL_PORTAL,
      label: ROUTE_LABELS.EXTERNAL_PORTAL,
      officialUrl: scheme.official_application_url || null,
      missingRequirements: [],
      requiredInfo: scheme.required_information || [],
      requiredDocs: scheme.required_documents || []
    };
  }

  // INTERNAL mode
  const missingInputs = (scheme.required_information || [])
    .filter(info => info.source === 'USER_INPUT' && (!userProvidedData || !userProvidedData[info.key]))
    .map(info => ({ type: 'INPUT', key: info.key, label: info.label }));

  const missingDocs = (scheme.required_documents || [])
    .filter(doc => !userProvidedDocs || !userProvidedDocs.includes(doc.key))
    .map(doc => ({ type: 'DOCUMENT', key: doc.key, label: doc.label }));

  const missingFacts = (missingInformation || []).map(info => ({
    type: 'FACT',
    key: info,
    label: info
  }));

  const allMissing = [...missingFacts, ...missingInputs, ...missingDocs];

  if (allMissing.length > 0) {
    return {
      route: APPLICATION_ROUTES.ADDITIONAL_INFO_REQUIRED,
      label: ROUTE_LABELS.ADDITIONAL_INFO_REQUIRED,
      officialUrl: null,
      missingRequirements: allMissing,
      requiredInfo: scheme.required_information || [],
      requiredDocs: scheme.required_documents || []
    };
  }

  return {
    route: APPLICATION_ROUTES.APPLY_HERE,
    label: ROUTE_LABELS.APPLY_HERE,
    officialUrl: null,
    missingRequirements: [],
    requiredInfo: scheme.required_information || [],
    requiredDocs: scheme.required_documents || []
  };
}
