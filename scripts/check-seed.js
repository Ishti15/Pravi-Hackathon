import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../public/sample-data');

const expectedColumns = {
  'health.csv': ['record_id', 'name', 'dob', 'gender', 'address', 'district', 'mobile', 'father_or_spouse_name', 'health_scheme_enrolled', 'identity_ref'],
  'education.csv': ['record_id', 'student_name', 'dob', 'gender', 'father_name', 'address', 'district', 'school', 'class', 'scholarship_enrolled', 'identity_ref'],
  'food.csv': ['record_id', 'ration_card_no', 'member_name', 'dob', 'gender', 'relationship_to_head', 'address', 'district', 'annual_income', 'card_type', 'identity_ref'],
  'labour.csv': ['record_id', 'worker_name', 'dob', 'gender', 'address', 'district', 'occupation', 'annual_income', 'worker_scheme_enrolled', 'identity_ref'],
  'housing.csv': ['record_id', 'applicant_name', 'dob', 'gender', 'address', 'district', 'annual_income', 'housing_status', 'housing_scheme_enrolled', 'identity_ref']
};

function parseSimpleCSV(content) {
  const lines = content.trim().split('\n').filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = [];
    let curr = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          curr += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(curr.trim());
        curr = '';
      } else {
        curr += char;
      }
    }
    values.push(curr.trim());
    
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    return obj;
  });
  return { headers, rows };
}

console.log('--- Verifying Seed CSV Files ---');

let allValid = true;
const datasets = {};
let totalRows = 0;

for (const [filename, cols] of Object.entries(expectedColumns)) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] File missing: ${filename}`);
    allValid = false;
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseSimpleCSV(content);
  datasets[filename] = rows;
  totalRows += rows.length;

  const headerMatch = cols.every((c, i) => headers[i] === c);
  if (!headerMatch) {
    console.error(`[ERROR] ${filename} header mismatch:`, headers, 'Expected:', cols);
    allValid = false;
  } else {
    console.log(`[OK] ${filename}: ${rows.length} rows, columns valid.`);
  }
}

console.log(`Total rows across 5 CSVs: ${totalRows}`);

// Scenario verification
const scenarios = [
  { id: 'S1', desc: 'Hero Patel family records (Health, Education, Food, Housing, Labour in Kalol)', check: () => {
    const h = datasets['health.csv'].filter(r => ['HLT-0001', 'HLT-0002', 'HLT-0003', 'HLT-0004'].includes(r.record_id));
    const e = datasets['education.csv'].filter(r => ['EDU-0001', 'EDU-0002'].includes(r.record_id));
    const f = datasets['food.csv'].filter(r => ['FOOD-0001', 'FOOD-0002', 'FOOD-0003', 'FOOD-0004'].includes(r.record_id));
    const hsg = datasets['housing.csv'].find(r => r.record_id === 'HSG-0001');
    const lab = datasets['labour.csv'].find(r => r.record_id === 'LAB-0001');
    return h.length === 4 && e.length === 2 && f.length === 4 && hsg && hsg.housing_status === 'KUTCHA' && lab && lab.occupation === 'LABOUR';
  }},
  { id: 'S2', desc: 'Auto-link Health Rameshbhai Patel (HLT-0001) & Labour Ramesh Patel (LAB-0001)', check: () => {
    const h = datasets['health.csv'].find(r => r.record_id === 'HLT-0001');
    const l = datasets['labour.csv'].find(r => r.record_id === 'LAB-0001');
    return h && l && h.district === 'Gandhinagar' && l.district === 'Gandhinagar';
  }},
  { id: 'S3', desc: 'Food Ramesh P Patel (FOOD-0001) older Sabarmati address lands in review queue', check: () => {
    const f = datasets['food.csv'].find(r => r.record_id === 'FOOD-0001');
    return f && f.ration_card_no === 'GJ-RC-100001' && f.district === 'Ahmedabad';
  }},
  { id: 'S4', desc: 'Trap Ramesh Patel (HLT-0005, FOOD-0005) in Mehsana (DOB 02/11/1975)', check: () => {
    const h = datasets['health.csv'].find(r => r.record_id === 'HLT-0005');
    const f = datasets['food.csv'].find(r => r.record_id === 'FOOD-0005');
    return h && f && h.district === 'Mehsana' && f.district === 'Mehsana';
  }},
  { id: 'S5', desc: 'Meena Patel (HLT-0002) and Meenaben R Patel (FOOD-0002) share identity_ref SYN-ID-000002', check: () => {
    const h = datasets['health.csv'].find(r => r.record_id === 'HLT-0002');
    const f = datasets['food.csv'].find(r => r.record_id === 'FOOD-0002');
    return h && f && h.identity_ref === 'SYN-ID-000002' && f.identity_ref === 'SYN-ID-000002';
  }},
  { id: 'S6', desc: 'Record with missing DOB (HLT-0006)', check: () => {
    const r = datasets['health.csv'].find(r => r.record_id === 'HLT-0006');
    return r && r.dob === '';
  }},
  { id: 'S7', desc: 'Exact duplicate row in health.csv (HLT-0007)', check: () => {
    const dups = datasets['health.csv'].filter(r => r.record_id === 'HLT-0007');
    return dups.length === 2;
  }},
  { id: 'S8', desc: 'Solanki family income conflict: Labour 200000 (LAB-0002) vs Food 350000 (FOOD-0007)', check: () => {
    const l = datasets['labour.csv'].find(r => r.record_id === 'LAB-0002');
    const f = datasets['food.csv'].find(r => r.record_id === 'FOOD-0007');
    return l && f && l.annual_income === '200000' && f.annual_income === '350000';
  }},
  { id: 'S9', desc: 'Unassigned persons with no ration card (LAB-0003, HLT-0008, HSG-0002)', check: () => {
    const l = datasets['labour.csv'].find(r => r.record_id === 'LAB-0003');
    const h = datasets['health.csv'].find(r => r.record_id === 'HLT-0008');
    const hsg = datasets['housing.csv'].find(r => r.record_id === 'HSG-0002');
    return l && h && hsg;
  }},
  { id: 'S10', desc: 'Family with missing income (FOOD-0009, FOOD-0010, HLT-0009)', check: () => {
    const f = datasets['food.csv'].find(r => r.record_id === 'FOOD-0009');
    return f && f.annual_income === '';
  }},
  { id: 'S11', desc: 'Fully enrolled family (GJ-RC-100004): HLT-0010, EDU-0003, HSG-0003', check: () => {
    const h = datasets['health.csv'].find(r => r.record_id === 'HLT-0010');
    const e = datasets['education.csv'].find(r => r.record_id === 'EDU-0003');
    const hsg = datasets['housing.csv'].find(r => r.record_id === 'HSG-0003');
    return h && e && hsg && h.health_scheme_enrolled === 'Y' && e.scholarship_enrolled === 'Y' && hsg.housing_scheme_enrolled === 'Y';
  }},
  { id: 'S12', desc: 'Family enrolled in family-level scheme via department: HLT-0011 (GJ-RC-100005)', check: () => {
    const h = datasets['health.csv'].find(r => r.record_id === 'HLT-0011');
    return h && h.health_scheme_enrolled === 'Y';
  }}
];

console.log('\n--- Verifying Scenarios S1 - S12 ---');
let scenariosValid = true;
for (const s of scenarios) {
  const ok = s.check();
  if (ok) {
    console.log(`[PASS] ${s.id}: ${s.desc}`);
  } else {
    console.error(`[FAIL] ${s.id}: ${s.desc}`);
    scenariosValid = false;
  }
}

if (allValid && scenariosValid) {
  console.log('\nALL CSV AND SCENARIO CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('\nSOME CHECKS FAILED.');
  process.exit(1);
}
