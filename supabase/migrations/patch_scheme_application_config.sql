-- Migration: Patch Scheme Application Configuration
-- Task 3B

-- 1. Modify scheme table: rename level to scope and add application routing columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scheme' AND column_name = 'level') THEN
    ALTER TABLE scheme RENAME COLUMN level TO scope;
  END IF;
END $$;

-- Drop old constraints first
ALTER TABLE scheme DROP CONSTRAINT IF EXISTS scheme_level_check;
ALTER TABLE scheme DROP CONSTRAINT IF EXISTS scheme_scope_check;

-- Migrate existing PERSON values to INDIVIDUAL BEFORE adding the new constraint
UPDATE scheme SET scope = 'INDIVIDUAL' WHERE scope = 'PERSON';

-- Now add the new constraint on scope
ALTER TABLE scheme ADD CONSTRAINT scheme_scope_check CHECK (scope IN ('INDIVIDUAL', 'FAMILY'));

-- Add application configuration columns to scheme
ALTER TABLE scheme ADD COLUMN IF NOT EXISTS application_mode TEXT DEFAULT 'INTERNAL' CHECK (application_mode IN ('INTERNAL', 'EXTERNAL'));
ALTER TABLE scheme ADD COLUMN IF NOT EXISTS official_application_url TEXT;
ALTER TABLE scheme ADD COLUMN IF NOT EXISTS required_information JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scheme ADD COLUMN IF NOT EXISTS required_documents JSONB DEFAULT '[]'::jsonb;

-- 2. Modify application table
ALTER TABLE application DROP CONSTRAINT IF EXISTS application_status_check;
ALTER TABLE application ADD CONSTRAINT application_status_check CHECK (status IN ('STARTED', 'SUBMITTED', 'UNDER_VERIFICATION', 'APPROVED', 'REJECTED', 'REFERRED'));

ALTER TABLE application ADD COLUMN IF NOT EXISTS application_mode TEXT CHECK (application_mode IN ('INTERNAL', 'EXTERNAL'));
ALTER TABLE application ADD COLUMN IF NOT EXISTS application_data JSONB DEFAULT '{}'::jsonb;

-- 3. Document table (metadata only)
CREATE TABLE IF NOT EXISTS document (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id TEXT REFERENCES person(person_id) ON DELETE CASCADE,
  family_id TEXT REFERENCES family(family_id) ON DELETE SET NULL,
  application_id UUID REFERENCES application(application_id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT,
  verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS across prototype tables
ALTER TABLE IF EXISTS person DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS source_record DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ingestion_batch DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS match_review DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS family DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS family_member DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scheme DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS eligibility_result DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS application DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS enrollment DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS data_conflict DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS change_request DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS identity_verification DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_log DISABLE ROW LEVEL SECURITY;

-- 4. Re-seed the 6 schemes with application configs
INSERT INTO scheme (
  scheme_code, name, department, description, scope, rule,
  application_mode, official_application_url, required_information, required_documents,
  benefit_description, renewal_months, active
)
VALUES 
(
  'STU-EDU',
  'Student Education Assistance',
  'Education',
  'Financial support for school students in low-income families.',
  'INDIVIDUAL',
  '{
    "logic": "ALL",
    "conditions": [
      { "fact": "age", "op": "between", "value": [6, 18], "label": "Age between 6 and 18" },
      { "fact": "is_student", "op": "eq", "value": true, "label": "Currently a student" },
      { "fact": "family_income", "op": "lt", "value": 300000, "label": "Family income below ₹3,00,000", "needs_verified": true }
    ]
  }'::jsonb,
  'INTERNAL',
  NULL,
  '[]'::jsonb,
  '[]'::jsonb,
  'Annual scholarship of ₹12,000 per eligible student.',
  12,
  true
),
(
  'GIRL-CHILD',
  'Girl Child Support',
  'Social Welfare',
  'Financial assistance and health grant for minor girls.',
  'INDIVIDUAL',
  '{
    "logic": "ALL",
    "conditions": [
      { "fact": "gender", "op": "eq", "value": "F", "label": "Female gender" },
      { "fact": "age", "op": "lt", "value": 18, "label": "Age under 18" },
      { "fact": "family_income", "op": "lt", "value": 300000, "label": "Family income below ₹3,00,000", "needs_verified": true }
    ]
  }'::jsonb,
  'INTERNAL',
  NULL,
  '[
    { "key": "bank_account_last4", "label": "Bank Account (Last 4 Digits)", "source": "USER_INPUT" }
  ]'::jsonb,
  '[
    { "key": "birth_certificate", "label": "Birth Certificate" }
  ]'::jsonb,
  'Monthly benefit of ₹1,500 for education & health needs.',
  12,
  true
),
(
  'FAM-HEALTH',
  'Family Health Cover',
  'Health',
  'Comprehensive health insurance for vulnerable households.',
  'FAMILY',
  '{
    "logic": "ALL",
    "conditions": [
      { "fact": "family_income", "op": "lt", "value": 500000, "label": "Family income below ₹5,00,000", "needs_verified": true }
    ]
  }'::jsonb,
  'INTERNAL',
  NULL,
  '[]'::jsonb,
  '[]'::jsonb,
  'Cashless health coverage up to ₹5,00,000 per family per year.',
  12,
  true
),
(
  'FOOD-SEC',
  'Food Security Support',
  'Food & Civil Supplies',
  'Subsidized food grains for low-income or priority card families.',
  'FAMILY',
  '{
    "logic": "ANY",
    "conditions": [
      { "fact": "family_income", "op": "lt", "value": 250000, "label": "Family income below ₹2,50,000", "needs_verified": true },
      { "fact": "card_type", "op": "eq", "value": "PRIORITY", "label": "Priority ration card holder" }
    ]
  }'::jsonb,
  'INTERNAL',
  NULL,
  '[]'::jsonb,
  '[]'::jsonb,
  'Monthly quota of subsidized food grains per household.',
  12,
  true
),
(
  'HOUSING',
  'Housing Assistance',
  'Housing',
  'Financial assistance to build permanent housing for families with Kutcha/No houses.',
  'FAMILY',
  '{
    "logic": "ALL",
    "conditions": [
      { "fact": "housing_status", "op": "in", "value": ["KUTCHA", "NONE"], "label": "Housing status Kutcha or None" },
      { "fact": "family_income", "op": "lt", "value": 300000, "label": "Family income below ₹3,00,000", "needs_verified": true }
    ]
  }'::jsonb,
  'EXTERNAL',
  'https://example.org/official-portal/housing',
  '[
    { "key": "land_ownership", "label": "Land Ownership Details", "source": "USER_INPUT" }
  ]'::jsonb,
  '[
    { "key": "house_photo", "label": "Current House Photograph" },
    { "key": "income_certificate", "label": "Income Certificate" }
  ]'::jsonb,
  'One-time financial grant of ₹1,20,000 for house construction.',
  36,
  true
),
(
  'LABOUR-WELFARE',
  'Registered Worker Welfare',
  'Labour',
  'Welfare scheme and safety kit support for registered workers.',
  'INDIVIDUAL',
  '{
    "logic": "ALL",
    "conditions": [
      { "fact": "age", "op": "between", "value": [18, 60], "label": "Age between 18 and 60" },
      { "fact": "occupation", "op": "in", "value": ["LABOUR", "WORKER", "CONSTRUCTION", "FACTORY", "DAILY_WAGER", "AGRICULTURAL_LABOUR"], "label": "Registered worker category" }
    ]
  }'::jsonb,
  'EXTERNAL',
  'https://example.org/official-portal/labour-welfare',
  '[
    { "key": "trade_union_no", "label": "Trade Union / Registration Number", "source": "USER_INPUT" }
  ]'::jsonb,
  '[
    { "key": "worker_id_card", "label": "Worker ID Card / Passbook" }
  ]'::jsonb,
  'Annual worker welfare stipend of ₹5,000 and safety equipment kit.',
  12,
  true
)
ON CONFLICT (scheme_code) DO UPDATE SET 
  name = EXCLUDED.name,
  department = EXCLUDED.department,
  description = EXCLUDED.description,
  scope = EXCLUDED.scope,
  rule = EXCLUDED.rule,
  application_mode = EXCLUDED.application_mode,
  official_application_url = EXCLUDED.official_application_url,
  required_information = EXCLUDED.required_information,
  required_documents = EXCLUDED.required_documents,
  benefit_description = EXCLUDED.benefit_description,
  renewal_months = EXCLUDED.renewal_months,
  active = EXCLUDED.active;
