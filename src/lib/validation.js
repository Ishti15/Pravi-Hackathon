// CSV Department Schemas and Ingestion Validation

export const DEPARTMENT_CONFIGS = {
  'Health': {
    code: 'HEALTH',
    name: 'Health',
    idCol: 'record_id',
    nameCol: 'name',
    expectedCols: ['record_id', 'name', 'dob', 'gender', 'address', 'district', 'mobile', 'father_or_spouse_name', 'health_scheme_enrolled', 'identity_ref'],
    extractAttributes: (row) => ({
      mobile: row.mobile || null,
      father_or_spouse_name: row.father_or_spouse_name || null,
      health_scheme_enrolled: row.health_scheme_enrolled === 'Y' || row.health_scheme_enrolled === 'true'
    })
  },
  'Education': {
    code: 'EDUCATION',
    name: 'Education',
    idCol: 'record_id',
    nameCol: 'student_name',
    expectedCols: ['record_id', 'student_name', 'dob', 'gender', 'father_name', 'address', 'district', 'school', 'class', 'scholarship_enrolled', 'identity_ref'],
    extractAttributes: (row) => ({
      father_name: row.father_name || null,
      school: row.school || null,
      class: row.class || null,
      is_student: true,
      scholarship_enrolled: row.scholarship_enrolled === 'Y' || row.scholarship_enrolled === 'true'
    })
  },
  'Food & Civil Supplies': {
    code: 'FOOD',
    name: 'Food & Civil Supplies',
    idCol: 'record_id',
    nameCol: 'member_name',
    expectedCols: ['record_id', 'ration_card_no', 'member_name', 'dob', 'gender', 'relationship_to_head', 'address', 'district', 'annual_income', 'card_type', 'identity_ref'],
    extractAttributes: (row) => ({
      ration_card_no: row.ration_card_no || null,
      relationship_to_head: row.relationship_to_head || 'OTHER',
      annual_income: row.annual_income ? Number(row.annual_income) : null,
      card_type: row.card_type || 'GENERAL'
    })
  },
  'Labour': {
    code: 'LABOUR',
    name: 'Labour',
    idCol: 'record_id',
    nameCol: 'worker_name',
    expectedCols: ['record_id', 'worker_name', 'dob', 'gender', 'address', 'district', 'occupation', 'annual_income', 'worker_scheme_enrolled', 'identity_ref'],
    extractAttributes: (row) => ({
      occupation: row.occupation || null,
      annual_income: row.annual_income ? Number(row.annual_income) : null,
      worker_scheme_enrolled: row.worker_scheme_enrolled === 'Y' || row.worker_scheme_enrolled === 'true'
    })
  },
  'Housing': {
    code: 'HOUSING',
    name: 'Housing',
    idCol: 'record_id',
    nameCol: 'applicant_name',
    expectedCols: ['record_id', 'applicant_name', 'dob', 'gender', 'address', 'district', 'annual_income', 'housing_status', 'housing_scheme_enrolled', 'identity_ref'],
    extractAttributes: (row) => ({
      annual_income: row.annual_income ? Number(row.annual_income) : null,
      housing_status: row.housing_status || 'NONE',
      housing_scheme_enrolled: row.housing_scheme_enrolled === 'Y' || row.housing_scheme_enrolled === 'true'
    })
  }
};

/**
 * Parses diverse date formats (DD/MM/YYYY, YYYY-MM-DD, D/M/YYYY) into ISO YYYY-MM-DD.
 * Returns null if blank, or throws an error if non-empty but invalid.
 */
export function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return null;
  }
  const clean = dateStr.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
    const [y, m, d] = clean.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    throw new Error(`Invalid date values in "${dateStr}"`);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(clean)) {
    const separator = clean.includes('/') ? '/' : '-';
    const [d, m, y] = clean.split(separator).map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    throw new Error(`Invalid date values in "${dateStr}"`);
  }

  throw new Error(`Unrecognized date format "${dateStr}"`);
}

/**
 * Validates parsed rows for a specific department.
 */
export function validateDepartmentRows(department, rows, existingKeys = new Set()) {
  const config = DEPARTMENT_CONFIGS[department] || Object.values(DEPARTMENT_CONFIGS).find(c => c.name.toLowerCase() === department.toLowerCase() || c.code.toLowerCase() === department.toLowerCase());
  
  if (!config) {
    throw new Error(`Unsupported department "${department}"`);
  }

  const validRows = [];
  const errorRows = [];
  const seenInBatch = new Set();
  let duplicatesInFile = 0;

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 2; // Accounting for 1-based index and header line
    const recordId = (rawRow[config.idCol] || '').trim();
    const personName = (rawRow[config.nameCol] || '').trim();

    // Check mandatory fields
    if (!recordId) {
      errorRows.push({
        rowNumber,
        message: `Missing record ID column "${config.idCol}"`,
        raw: rawRow
      });
      return;
    }

    if (!personName) {
      errorRows.push({
        rowNumber,
        message: `Missing required name column "${config.nameCol}"`,
        raw: rawRow
      });
      return;
    }

    // Check Gender
    let gender = (rawRow.gender || '').trim().toUpperCase();
    if (gender && !['M', 'F', 'O'].includes(gender)) {
      errorRows.push({
        rowNumber,
        message: `Invalid gender "${rawRow.gender}". Must be M, F, or O`,
        raw: rawRow
      });
      return;
    }

    // Check Date of Birth
    let parsedDob = null;
    if (rawRow.dob && rawRow.dob.trim()) {
      try {
        parsedDob = parseDate(rawRow.dob);
      } catch (err) {
        errorRows.push({
          rowNumber,
          message: `Invalid date of birth: ${err.message}`,
          raw: rawRow
        });
        return;
      }
    }

    // Check for duplicate in batch
    if (seenInBatch.has(recordId)) {
      duplicatesInFile++;
      // Still treat as duplicate, skip adding duplicate source record to avoid PK/unq constraint
      return;
    }
    seenInBatch.add(recordId);

    // Check if already exists in DB
    if (existingKeys.has(recordId)) {
      duplicatesInFile++;
      return;
    }

    validRows.push({
      department: config.name,
      source_key: recordId,
      source_person_name: personName,
      source_dob: parsedDob,
      source_gender: gender || null,
      source_address: (rawRow.address || '').trim() || null,
      district: (rawRow.district || '').trim() || null,
      source_identifier: (rawRow.identity_ref || '').trim() || null,
      household_ref: (rawRow.ration_card_no || '').trim() || null,
      relationship_to_head: (rawRow.relationship_to_head || '').trim().toUpperCase() || null,
      father_or_spouse_name: (rawRow.father_or_spouse_name || rawRow.father_name || '').trim() || null,
      attributes: config.extractAttributes(rawRow),
      raw: rawRow
    });
  });

  return {
    validRows,
    errorRows,
    duplicatesInFile
  };
}
