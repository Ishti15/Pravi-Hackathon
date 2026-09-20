// Name and Address Normalization Pure Functions

const HONORIFICS = new Set(['shri', 'smt', 'mr', 'mrs', 'shree', 'kumari', 'dr', 'prof']);
const SUFFIXES = ['bhai', 'ben', 'kumar', 'lal', 'bai'];

/**
 * Normalizes a personal name string.
 * - Lowercase
 * - Strip punctuation
 * - Remove honorifics
 * - Strip trailing bhai / ben / kumar / lal from individual tokens
 * - Returns normalized full string and array of tokens
 */
export function normalizeName(nameStr) {
  if (!nameStr || typeof nameStr !== 'string') {
    return { normalized: '', tokens: [] };
  }

  // Lowercase & remove punctuation (keep alphanumeric & spaces)
  const clean = nameStr
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) {
    return { normalized: '', tokens: [] };
  }

  const rawTokens = clean.split(' ').filter(Boolean);
  const filteredTokens = [];

  for (const token of rawTokens) {
    if (HONORIFICS.has(token)) {
      continue;
    }

    let stripped = token;
    for (const suffix of SUFFIXES) {
      if (stripped.length > suffix.length + 2 && stripped.endsWith(suffix)) {
        stripped = stripped.slice(0, -suffix.length);
        break; // Only strip one suffix
      }
    }

    if (stripped.length > 0) {
      filteredTokens.push(stripped);
    }
  }

  return {
    normalized: filteredTokens.join(' '),
    tokens: filteredTokens
  };
}

const ADDRESS_STOPWORDS = new Set([
  'nr', 'near', 'opp', 'opposite', 'behind', 'beside',
  'road', 'rd', 'street', 'st', 'society', 'soc', 'flat', 'flats', 'nagar', 'colony',
  'gam', 'village', 'taluka', 'dist', 'district', 'block', 'plot', 'sector', 'chali', 'wada'
]);

/**
 * Normalizes an address string into non-trivial keyword tokens.
 */
export function normalizeAddress(addressStr) {
  if (!addressStr || typeof addressStr !== 'string') {
    return { normalized: '', tokens: [] };
  }

  const clean = addressStr
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) {
    return { normalized: '', tokens: [] };
  }

  const tokens = clean
    .split(' ')
    .filter(t => t.length > 1 && !ADDRESS_STOPWORDS.has(t));

  return {
    normalized: clean,
    tokens
  };
}
