// Pure Eligibility Evaluation Engine (§10)

/**
 * Calculates age in whole years from a birth date string (YYYY-MM-DD or DD/MM/YYYY)
 */
export function calculateAge(dobStr, refDate = new Date('2024-09-01')) {
  if (!dobStr || typeof dobStr !== 'string') return null;
  
  let birthDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dobStr.trim())) {
    birthDate = new Date(dobStr.trim());
  } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(dobStr.trim())) {
    const sep = dobStr.includes('/') ? '/' : '-';
    const [d, m, y] = dobStr.split(sep).map(Number);
    birthDate = new Date(y, m - 1, d);
  } else {
    birthDate = new Date(dobStr);
  }

  if (isNaN(birthDate.getTime())) return null;

  let age = refDate.getFullYear() - birthDate.getFullYear();
  const m = refDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

/**
 * Extracts normalized facts for a subject (Person or Family)
 */
export function buildFacts(subject, family = null, sourceRecords = [], openConflicts = []) {
  const isFamily = !subject || !subject.person_id;
  const effectiveFamily = isFamily ? subject : family;
  const person = isFamily ? null : subject;

  const relevantRecords = isFamily
    ? sourceRecords
    : sourceRecords.filter(r => r.person_id === person?.person_id);

  // Student flag
  let isStudent = false;
  if (person) {
    if (person.is_student) isStudent = true;
    else if (relevantRecords.some(r => r.attributes?.is_student || r.department === 'Education')) isStudent = true;
  }

  // Occupation
  let occupation = null;
  if (person) {
    if (person.occupation) occupation = person.occupation;
    else {
      const labourRec = relevantRecords.find(r => r.attributes?.occupation);
      if (labourRec) occupation = labourRec.attributes.occupation;
    }
  }

  // Housing status
  let housingStatus = null;
  const housingRec = sourceRecords.find(r => r.attributes?.housing_status);
  if (housingRec?.attributes?.housing_status) {
    housingStatus = String(housingRec.attributes.housing_status).toUpperCase();
  }

  // Family Income
  let familyIncome = null;
  if (effectiveFamily?.household_income != null && effectiveFamily.household_income !== '') {
    familyIncome = Number(effectiveFamily.household_income);
  }

  // Card Type
  let cardType = null;
  if (effectiveFamily?.family_category) {
    cardType = effectiveFamily.family_category.toUpperCase();
  } else {
    const foodRec = sourceRecords.find(r => r.attributes?.card_type);
    if (foodRec?.attributes?.card_type) {
      cardType = foodRec.attributes.card_type.toUpperCase();
    }
  }

  return {
    age: person?.dob ? calculateAge(person.dob) : null,
    gender: person?.gender ? person.gender.toUpperCase() : null,
    is_student: isStudent,
    occupation: occupation ? occupation.trim() : null,
    family_income: familyIncome,
    card_type: cardType,
    housing_status: housingStatus
  };
}

/**
 * Evaluates a single condition against extracted facts
 */
export function evaluateCondition(cond, facts, openConflicts = []) {
  const { fact, op, value, label, needs_verified } = cond;
  const factVal = facts[fact];

  // 1. Check open conflicts if needs_verified
  if (needs_verified) {
    const conflictField = fact === 'family_income' ? 'income' : fact;
    const hasConflict = openConflicts.some(
      c => c.status === 'OPEN' && (c.field_name === conflictField || c.field_name === fact)
    );
    if (hasConflict) {
      return {
        conditionStatus: 'UNKNOWN',
        reason: `${label || fact} requires verification due to conflicting records`,
        missingInfo: `${label || fact} verification required`
      };
    }
  }

  // 2. Missing/null fact
  if (factVal == null) {
    const missingLabel = fact === 'family_income' ? 'Income verification required' : (label || `${fact} not recorded`);
    return {
      conditionStatus: 'UNKNOWN',
      reason: `Missing information for: ${label || fact}`,
      missingInfo: missingLabel
    };
  }

  // 3. Evaluate operator
  let isMet = false;
  let detail = '';

  switch (op) {
    case 'eq':
      isMet = factVal === value;
      detail = isMet ? `matches required value (${factVal})` : `expected ${value}, got ${factVal}`;
      break;

    case 'neq':
      isMet = factVal !== value;
      detail = isMet ? `satisfies condition` : `cannot equal ${value}`;
      break;

    case 'lt':
      isMet = Number(factVal) < Number(value);
      detail = isMet ? `₹${Number(factVal).toLocaleString('en-IN')} < ₹${Number(value).toLocaleString('en-IN')}` : `₹${Number(factVal).toLocaleString('en-IN')} is not below ₹${Number(value).toLocaleString('en-IN')}`;
      break;

    case 'lte':
      isMet = Number(factVal) <= Number(value);
      detail = isMet ? `within limit (${factVal})` : `exceeds limit (${factVal} > ${value})`;
      break;

    case 'gt':
      isMet = Number(factVal) > Number(value);
      detail = isMet ? `above required threshold` : `below required threshold`;
      break;

    case 'gte':
      isMet = Number(factVal) >= Number(value);
      detail = isMet ? `meets minimum requirement` : `below minimum requirement`;
      break;

    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        const num = Number(factVal);
        isMet = num >= Number(value[0]) && num <= Number(value[1]);
        detail = isMet ? `age ${num} is between ${value[0]} and ${value[1]}` : `age ${num} is outside ${value[0]}-${value[1]}`;
      }
      break;

    case 'in':
      if (Array.isArray(value)) {
        if (fact === 'occupation' && typeof factVal === 'string') {
          const upperVal = factVal.toUpperCase();
          isMet = value.some(target => {
            const t = target.toUpperCase().replace('_', ' ');
            return upperVal.includes(t) || t.includes(upperVal);
          });
          detail = isMet ? `occupation "${factVal}" qualifies` : `occupation "${factVal}" does not qualify`;
        } else {
          isMet = value.includes(factVal);
          detail = isMet ? `"${factVal}" is eligible` : `"${factVal}" not in allowed list [${value.join(', ')}]`;
        }
      }
      break;

    default:
      isMet = false;
      detail = `unsupported operator ${op}`;
  }

  const cleanLabel = label || `${fact} ${op} ${value}`;

  if (isMet) {
    return {
      conditionStatus: 'MET',
      reason: `${cleanLabel} satisfied (${detail})`,
      missingInfo: null
    };
  } else {
    return {
      conditionStatus: 'NOT_MET',
      reason: `${cleanLabel} not satisfied: ${detail}`,
      missingInfo: null
    };
  }
}

/**
 * Evaluates a scheme's rule against a subject
 */
export function evaluateSchemeEligibility(scheme, subject, family = null, sourceRecords = [], openConflicts = []) {
  const isFamily = scheme.scope === 'FAMILY';
  const subjectType = isFamily ? 'FAMILY' : 'PERSON';
  const subjectId = isFamily
    ? (family?.family_id || subject?.family_id || subject?.id)
    : (subject?.person_id || subject?.id);

  const facts = buildFacts(subject, family, sourceRecords, openConflicts);
  const rule = scheme.rule || { logic: 'ALL', conditions: [] };
  const logic = rule.logic || 'ALL';
  const conditions = rule.conditions || [];

  const results = conditions.map(c => evaluateCondition(c, facts, openConflicts));

  const reasons = [];
  const missingInfo = [];

  let status = 'NOT_ELIGIBLE';

  if (logic === 'ANY') {
    const anyMet = results.some(r => r.conditionStatus === 'MET');
    const anyUnknown = results.some(r => r.conditionStatus === 'UNKNOWN');

    if (anyMet) {
      status = 'ELIGIBLE';
    } else if (anyUnknown) {
      status = 'POTENTIALLY_ELIGIBLE';
    } else {
      status = 'NOT_ELIGIBLE';
    }
  } else {
    // ALL
    const anyNotMet = results.some(r => r.conditionStatus === 'NOT_MET');
    const anyUnknown = results.some(r => r.conditionStatus === 'UNKNOWN');

    if (anyNotMet) {
      status = 'NOT_ELIGIBLE';
    } else if (anyUnknown) {
      status = 'POTENTIALLY_ELIGIBLE';
    } else {
      status = 'ELIGIBLE';
    }
  }

  for (const res of results) {
    if (res.reason) reasons.push(res.reason);
    if (res.missingInfo) missingInfo.push(res.missingInfo);
  }

  return {
    scheme_code: scheme.scheme_code,
    scheme_name: scheme.name,
    subject_type: subjectType,
    subject_id: subjectId,
    family_id: family?.family_id || (isFamily ? subjectId : null),
    status,
    reasons,
    missing_information: Array.from(new Set(missingInfo)),
    facts
  };
}
