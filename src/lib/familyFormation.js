// Pure Family Formation and Reconciliation Logic (§9)

export const RELATIONSHIP_MAP = {
  HEAD: 'HEAD',
  SELF: 'HEAD',
  SPOUSE: 'SPOUSE',
  WIFE: 'SPOUSE',
  HUSBAND: 'SPOUSE',
  SON: 'SON',
  DAUGHTER: 'DAUGHTER',
  CHILD: 'OTHER',
  FATHER: 'PARENT',
  MOTHER: 'PARENT',
  PARENT: 'PARENT',
  BROTHER: 'OTHER',
  SISTER: 'OTHER',
  OTHER: 'OTHER'
};

/**
 * Normalizes source relationship string to canonical enum:
 * HEAD | SPOUSE | SON | DAUGHTER | PARENT | OTHER
 */
export function normalizeRelationship(relStr, isHeadCandidate = false) {
  if (!relStr || typeof relStr !== 'string') {
    return isHeadCandidate ? 'HEAD' : 'OTHER';
  }
  const clean = relStr.trim().toUpperCase();
  return RELATIONSHIP_MAP[clean] || (isHeadCandidate ? 'HEAD' : 'OTHER');
}

/**
 * Groups linked source records by household_ref (ration card)
 * and determines which households are held back due to pending reviews.
 * 
 * @param {Array} sourceRecords - All staged source records
 * @param {Array} persons - All existing persons
 * @param {Array} matchReviews - All match reviews (to check pending status)
 */
export function buildHouseholdGroups(sourceRecords = [], persons = [], matchReviews = []) {
  const pendingReviewRecordIds = new Set();
  for (const r of matchReviews) {
    if (r.status === 'PENDING') {
      if (r.source_record_id) pendingReviewRecordIds.add(r.source_record_id);
      if (r.sourceRecordId) pendingReviewRecordIds.add(r.sourceRecordId);
      if (r.sourceRecord?.source_record_id) pendingReviewRecordIds.add(r.sourceRecord.source_record_id);
      if (r.sourceRecord?.source_key) pendingReviewRecordIds.add(r.sourceRecord.source_key);
    }
  }

  // Group records with household_ref
  const groups = new Map(); // household_ref -> { householdRef, records: [], personIds: Set, isHeldBack: boolean, holdReasons: [] }
  const personsWithHousehold = new Set();

  for (const record of sourceRecords) {
    const hhRef = record.household_ref ? record.household_ref.trim() : null;
    if (!hhRef) continue;

    if (!groups.has(hhRef)) {
      groups.set(hhRef, {
        householdRef: hhRef,
        records: [],
        personIds: new Set(),
        isHeldBack: false,
        holdReasons: []
      });
    }

    const grp = groups.get(hhRef);
    grp.records.push(record);

    // If this record is in pending review, the whole household must be held back
    if (
      record.match_method === 'PENDING_REVIEW' ||
      pendingReviewRecordIds.has(record.source_record_id) ||
      (record.source_key && pendingReviewRecordIds.has(record.source_key))
    ) {
      grp.isHeldBack = true;
      grp.holdReasons.push(`Record ${record.source_key} (${record.department}) is pending officer identity review`);
    }

    if (record.person_id) {
      grp.personIds.add(record.person_id);
      personsWithHousehold.add(record.person_id);
    }
  }

  // Determine unassigned persons (persons who have no household_ref or all their records belong to held-back households)
  const activeHouseholdPersonIds = new Set();
  for (const grp of groups.values()) {
    if (!grp.isHeldBack) {
      grp.personIds.forEach(id => activeHouseholdPersonIds.add(id));
    }
  }

  const unassignedPersons = persons.filter(p => !activeHouseholdPersonIds.has(p.person_id));

  return {
    householdGroups: Array.from(groups.values()),
    unassignedPersons
  };
}

/**
 * Extracts canonical family attributes for an active household group:
 * - Head person ID
 * - Address & district from head's records
 * - Household income: Priority Food -> Housing -> Labour
 * - Family category: from card_type (PRIORITY / GENERAL)
 * - Member relationships
 */
export function deriveFamilyAttributes(householdGroup, persons = []) {
  const { householdRef, records, personIds } = householdGroup;

  // 1. Identify Head person
  // Priority: record with relationship_to_head === 'HEAD' (especially from Food)
  let headRecord = records.find(r => (r.relationship_to_head || '').toUpperCase() === 'HEAD' && r.department === 'Food & Civil Supplies');
  if (!headRecord) {
    headRecord = records.find(r => (r.relationship_to_head || '').toUpperCase() === 'HEAD');
  }
  if (!headRecord && records.length > 0) {
    headRecord = records[0];
  }

  const headPersonId = headRecord?.person_id || Array.from(personIds)[0] || null;

  // 2. Address & Location
  // Priority: head's address, otherwise first available non-empty address
  const addressRecord = records.find(r => r.person_id === headPersonId && r.source_address) || records.find(r => r.source_address);
  const address = addressRecord?.source_address || '';
  const district = addressRecord?.district || headRecord?.district || '';

  // Extract city/village/taluka context if available
  let cityOrVillage = '';
  if (address.toLowerCase().includes('kalol')) cityOrVillage = 'Kalol';
  else if (address.toLowerCase().includes('sabarmati')) cityOrVillage = 'Sabarmati';
  else if (address.toLowerCase().includes('khedbrahma')) cityOrVillage = 'Khedbrahma';
  else if (district) cityOrVillage = district;

  // 3. Household Income
  // Priority order per §9: Food -> Housing -> Labour
  let householdIncome = null;
  let incomeSource = null;

  const foodRecordWithIncome = records.find(r => r.department === 'Food & Civil Supplies' && r.attributes?.annual_income != null && r.attributes.annual_income !== '');
  const housingRecordWithIncome = records.find(r => r.department === 'Housing' && r.attributes?.annual_income != null && r.attributes.annual_income !== '');
  const labourRecordWithIncome = records.find(r => r.department === 'Labour' && r.attributes?.annual_income != null && r.attributes.annual_income !== '');

  if (foodRecordWithIncome) {
    householdIncome = Number(foodRecordWithIncome.attributes.annual_income);
    incomeSource = 'Food & Civil Supplies';
  } else if (housingRecordWithIncome) {
    householdIncome = Number(housingRecordWithIncome.attributes.annual_income);
    incomeSource = 'Housing';
  } else if (labourRecordWithIncome) {
    householdIncome = Number(labourRecordWithIncome.attributes.annual_income);
    incomeSource = 'Labour';
  }

  // 4. Family Category
  // From card_type on Food records: PRIORITY or GENERAL
  const foodRecord = records.find(r => r.department === 'Food & Civil Supplies');
  const cardType = (foodRecord?.attributes?.card_type || '').toUpperCase();
  const familyCategory = cardType === 'PRIORITY' ? 'PRIORITY' : 'GENERAL';

  // 5. Member relationships
  const members = [];
  for (const personId of personIds) {
    const person = persons.find(p => p.person_id === personId);
    const memberRecords = records.filter(r => r.person_id === personId);

    // Derive relationship to head
    let rel = 'OTHER';
    if (personId === headPersonId) {
      rel = 'HEAD';
    } else {
      const relRecord = memberRecords.find(r => r.relationship_to_head);
      rel = normalizeRelationship(relRecord?.relationship_to_head, false);
    }

    members.push({
      person_id: personId,
      relationship: rel,
      person
    });
  }

  return {
    household_ref: householdRef,
    head_person_id: headPersonId,
    address,
    district,
    taluka: cityOrVillage,
    city_or_village: cityOrVillage,
    household_income: householdIncome,
    income_source: incomeSource,
    family_category: familyCategory,
    family_status: 'ACTIVE',
    members
  };
}
