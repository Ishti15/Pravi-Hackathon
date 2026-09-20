// String and Token Similarity Functions (Edit distance <= 1 + Initial matching)

import { normalizeName, normalizeAddress } from './normalize';

/**
 * Calculates Levenshtein edit distance between two strings.
 */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if two single name tokens match.
 * - Exact match
 * - Single letter initial match with first letter of other token (e.g. 'p' ~ 'patel' or 'p' ~ 'p')
 * - Levenshtein distance <= 1 (if both tokens >= 3 chars)
 */
export function tokensMatch(t1, t2) {
  if (t1 === t2) return true;

  // Initial check: if one is single letter, it must match first letter of the other
  if (t1.length === 1 && t2.length >= 1) {
    return t1[0] === t2[0];
  }
  if (t2.length === 1 && t1.length >= 1) {
    return t2[0] === t1[0];
  }

  // Edit distance <= 1 only for tokens of length >= 3
  if (t1.length >= 3 && t2.length >= 3) {
    return levenshtein(t1, t2) <= 1;
  }

  return false;
}

/**
 * Compares two full names after token normalization.
 * Returns { match: boolean, reason: string }
 */
export function namesMatch(nameStrA, nameStrB) {
  const normA = normalizeName(nameStrA);
  const normB = normalizeName(nameStrB);

  const tokensA = normA.tokens;
  const tokensB = normB.tokens;

  if (tokensA.length === 0 || tokensB.length === 0) {
    return { match: false, reason: 'Empty name' };
  }

  // Exact normalized match
  if (normA.normalized === normB.normalized) {
    return {
      match: true,
      reason: `Exact name match after normalization ("${normA.normalized}")`
    };
  }

  // Check token-by-token alignment
  // If lengths match:
  if (tokensA.length === tokensB.length) {
    const allMatch = tokensA.every((t, i) => tokensMatch(t, tokensB[i]));
    if (allMatch) {
      return {
        match: true,
        reason: `Names match token-by-token (${nameStrA} ~ ${nameStrB})`
      };
    }
  }

  // If one name has initial or middle name variation (e.g. "Ramesh P Patel" vs "Rameshbhai Patel")
  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longer = tokensA.length <= tokensB.length ? tokensB : tokensA;

  let allShortFound = true;
  let lastIndex = -1;

  for (const sToken of shorter) {
    const matchIdx = longer.findIndex((lToken, idx) => idx > lastIndex && tokensMatch(sToken, lToken));
    if (matchIdx !== -1) {
      lastIndex = matchIdx;
    } else {
      allShortFound = false;
      break;
    }
  }

  if (allShortFound) {
    return {
      match: true,
      reason: `Names match with initial/variant compatibility (${nameStrA} ~ ${nameStrB})`
    };
  }

  return { match: false, reason: `Names differ (${normA.normalized} vs ${normB.normalized})` };
}

/**
 * Checks if two addresses match.
 * Requires same district + at least 2 non-trivial shared tokens (or same village/city).
 */
export function addressesMatch(addrStrA, districtA, addrStrB, districtB) {
  const distA = (districtA || '').trim().toLowerCase();
  const distB = (districtB || '').trim().toLowerCase();

  if (!distA || !distB || distA !== distB) {
    return {
      match: false,
      reason: `Districts differ (${districtA || 'None'} vs ${districtB || 'None'})`
    };
  }

  const normA = normalizeAddress(addrStrA);
  const normB = normalizeAddress(addrStrB);

  // Exact normalized address match
  if (normA.normalized && normA.normalized === normB.normalized) {
    return {
      match: true,
      reason: `Same address in ${districtA}`
    };
  }

  const setB = new Set(normB.tokens);
  const sharedTokens = normA.tokens.filter(t => setB.has(t));

  if (sharedTokens.length >= 2) {
    return {
      match: true,
      reason: `Matching address tokens in ${districtA} (${sharedTokens.join(', ')})`
    };
  }

  // If both have 1 non-trivial token and they match (e.g. village name like "khedbrahma" or "kalol")
  if (sharedTokens.length === 1 && (normA.tokens.length === 1 || normB.tokens.length === 1)) {
    return {
      match: true,
      reason: `Matching area/village token in ${districtA} (${sharedTokens[0]})`
    };
  }

  return {
    match: false,
    reason: `Address differs: "${addrStrA || ''}" vs "${addrStrB || ''}"`
  };
}
