// Record Linking Engine (Rule-based, §8)

import { normalizeName } from './normalize';
import { namesMatch, addressesMatch } from './similarity';

export const MATCH_METHODS = {
  VERIFIED_ID: 'VERIFIED_ID',
  AUTO_LINK: 'AUTO_LINK',
  OFFICER_APPROVED: 'OFFICER_APPROVED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  NEW_PERSON: 'NEW_PERSON'
};

export const MATCH_STRENGTHS = {
  VERIFIED: 'VERIFIED',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

/**
 * Evaluates linking decision for an incoming source record against existing persons and their source records.
 * Returns { decision, candidatePersonId, strength, reasons }
 */
export function evaluateRecordLink(sourceRecord, existingPersons = [], existingSourceRecords = []) {
  const norm = normalizeName(sourceRecord.source_person_name);
  const normalizedName = norm.normalized;

  // If DOB or Gender is missing, no candidates are evaluated -> NEW_PERSON with data flags
  if (!sourceRecord.source_dob || !sourceRecord.source_gender) {
    const flags = [];
    if (!sourceRecord.source_dob) flags.push('MISSING_DOB');
    if (!sourceRecord.source_gender) flags.push('MISSING_GENDER');

    return {
      decision: MATCH_METHODS.NEW_PERSON,
      candidatePersonId: null,
      strength: null,
      reasons: [
        `Record lacks mandatory matching attributes (${flags.join(', ')})`,
        'Created new person profile with verification flag'
      ],
      dataFlags: flags,
      normalizedName
    };
  }

  // 1. Identity Reference matching (evaluated even if DOB/Gender differ or across all persons)
  if (sourceRecord.source_identifier && sourceRecord.source_identifier.trim()) {
    const targetRef = sourceRecord.source_identifier.trim();
    
    // Check existing persons or their source records with matching identity_reference
    for (const p of existingPersons) {
      const personHasRef = p.identity_reference === targetRef;
      const linkedRecordHasRef = existingSourceRecords.some(
        sr => sr.person_id === p.person_id && sr.source_identifier === targetRef
      );

      if (personHasRef || linkedRecordHasRef) {
        return {
          decision: MATCH_METHODS.VERIFIED_ID,
          candidatePersonId: p.person_id,
          strength: MATCH_STRENGTHS.VERIFIED,
          reasons: [
            `Verified identity token match (${targetRef})`,
            `Linked to person ${p.person_id} (${p.canonical_name})`
          ],
          dataFlags: [],
          normalizedName
        };
      }
    }
  }

  // Filter candidate persons sharing identical DOB AND Gender
  const candidates = existingPersons.filter(
    p => p.dob === sourceRecord.source_dob && p.gender === sourceRecord.source_gender
  );

  if (candidates.length === 0) {
    return {
      decision: MATCH_METHODS.NEW_PERSON,
      candidatePersonId: null,
      strength: null,
      reasons: ['No existing person with matching DOB and gender'],
      dataFlags: [],
      normalizedName
    };
  }

  // Evaluate candidate persons
  for (const candidate of candidates) {
    // Get all linked source records of this candidate to compare known names and addresses
    const candidateRecords = existingSourceRecords.filter(sr => sr.person_id === candidate.person_id);
    const candidateAddresses = candidateRecords.map(r => ({
      address: r.source_address,
      district: r.district
    }));

    // Compare incoming name against candidate canonical name and all linked source names
    const namesToTest = [
      candidate.canonical_name,
      ...candidateRecords.map(r => r.source_person_name)
    ];

    let bestNameMatch = { match: false };
    for (const name of namesToTest) {
      const res = namesMatch(sourceRecord.source_person_name, name);
      if (res.match) {
        bestNameMatch = res;
        break;
      }
    }

    if (!bestNameMatch.match) {
      continue;
    }

    // Compare incoming address against candidate addresses
    let addressMatched = false;
    let bestAddressReason = '';

    for (const ca of candidateAddresses) {
      const addrRes = addressesMatch(
        sourceRecord.source_address,
        sourceRecord.district,
        ca.address,
        ca.district
      );
      if (addrRes.match) {
        addressMatched = true;
        bestAddressReason = addrRes.reason;
        break;
      } else {
        bestAddressReason = addrRes.reason;
      }
    }

    // 2. Names match AND addresses match -> AUTO_LINK
    if (addressMatched) {
      return {
        decision: MATCH_METHODS.AUTO_LINK,
        candidatePersonId: candidate.person_id,
        strength: MATCH_STRENGTHS.HIGH,
        reasons: [
          bestNameMatch.reason,
          `Matching DOB (${sourceRecord.source_dob}) and Gender (${sourceRecord.source_gender})`,
          bestAddressReason
        ],
        dataFlags: [],
        normalizedName
      };
    }

    // 3. Names match BUT addresses differ -> PENDING_REVIEW (Officer Review Queue)
    return {
      decision: MATCH_METHODS.PENDING_REVIEW,
      candidatePersonId: candidate.person_id,
      strength: MATCH_STRENGTHS.MEDIUM,
      reasons: [
        bestNameMatch.reason,
        `Matching DOB (${sourceRecord.source_dob}) and Gender (${sourceRecord.source_gender})`,
        bestAddressReason || `Address differs: "${sourceRecord.source_address}" vs "${candidateRecords[0]?.source_address || ''}"`
      ],
      dataFlags: [],
      normalizedName
    };
  }

  // 4. Otherwise -> NEW_PERSON
  return {
    decision: MATCH_METHODS.NEW_PERSON,
    candidatePersonId: null,
    strength: null,
    reasons: ['Same DOB/gender candidate found but name normalization did not match'],
    dataFlags: [],
    normalizedName
  };
}

/**
 * Creates a new canonical Person entity from a source record.
 */
export function createPersonFromSourceRecord(sourceRecord, personId, dataFlags = []) {
  const isVerified = Boolean(sourceRecord.source_identifier && sourceRecord.source_identifier.trim());

  return {
    person_id: personId,
    canonical_name: sourceRecord.source_person_name,
    dob: sourceRecord.source_dob || null,
    gender: sourceRecord.source_gender || null,
    occupation: sourceRecord.attributes?.occupation || null,
    is_student: Boolean(sourceRecord.attributes?.is_student),
    education_class: sourceRecord.attributes?.class || null,
    identity_status: isVerified ? 'VERIFIED' : 'UNVERIFIED',
    identity_reference: sourceRecord.source_identifier || null,
    data_flags: dataFlags,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
