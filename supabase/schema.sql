-- Family ID Gujarat - Schema SQL Definition
-- Synthetic data prototype schema

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- Sequences
-- -------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS person_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS family_seq START WITH 1;

-- Helper functions for ID formatting
CREATE OR REPLACE FUNCTION next_person_id() RETURNS text AS $$
BEGIN
  RETURN 'P' || LPAD(NEXTVAL('person_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION next_family_id() RETURNS text AS $$
BEGIN
  RETURN 'FAM-GJ-' || LPAD(NEXTVAL('family_seq')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------
-- Core Tables
-- -------------------------------------------------------------

-- Person
CREATE TABLE IF NOT EXISTS person (
  person_id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  dob DATE,
  gender TEXT CHECK (gender IN ('M', 'F', 'O')),
  occupation TEXT,
  is_student BOOLEAN DEFAULT false,
  education_class TEXT,
  identity_status TEXT DEFAULT 'UNVERIFIED' CHECK (identity_status IN ('VERIFIED', 'UNVERIFIED')),
  identity_reference TEXT,
  data_flags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingestion Batch
CREATE TABLE IF NOT EXISTS ingestion_batch (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  total_rows INT DEFAULT 0,
  imported_rows INT DEFAULT 0,
  error_rows INT DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  linked_records INT DEFAULT 0,
  review_queued INT DEFAULT 0,
  new_persons INT DEFAULT 0,
  duplicates_in_file INT DEFAULT 0,
  conflicts_detected INT DEFAULT 0
);

-- Source Record
CREATE TABLE IF NOT EXISTS source_record (
  source_record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES ingestion_batch(batch_id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  source_key TEXT NOT NULL,
  source_person_name TEXT NOT NULL,
  source_dob DATE,
  source_gender TEXT,
  source_address TEXT,
  district TEXT,
  source_identifier TEXT,
  household_ref TEXT,
  relationship_to_head TEXT,
  father_or_spouse_name TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  raw JSONB DEFAULT '{}'::jsonb,
  normalized_name TEXT,
  person_id TEXT REFERENCES person(person_id) ON DELETE SET NULL,
  match_method TEXT CHECK (match_method IN ('VERIFIED_ID', 'AUTO_LINK', 'OFFICER_APPROVED', 'NEW_PERSON', 'PENDING_REVIEW')),
  match_strength TEXT CHECK (match_strength IN ('VERIFIED', 'HIGH', 'MEDIUM', 'LOW')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unq_dept_source_key UNIQUE (department, source_key)
);

-- Match Review
CREATE TABLE IF NOT EXISTS match_review (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_id UUID REFERENCES source_record(source_record_id) ON DELETE CASCADE,
  candidate_person_id TEXT REFERENCES person(person_id) ON DELETE CASCADE,
  strength TEXT CHECK (strength IN ('VERIFIED', 'HIGH', 'MEDIUM', 'LOW')),
  reasons JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  note TEXT
);

-- Family
CREATE TABLE IF NOT EXISTS family (
  family_id TEXT PRIMARY KEY,
  household_ref TEXT,
  address TEXT,
  district TEXT,
  taluka TEXT,
  city_or_village TEXT,
  household_income NUMERIC(12, 2),
  income_source TEXT,
  family_category TEXT,
  family_status TEXT DEFAULT 'ACTIVE' CHECK (family_status IN ('ACTIVE', 'PENDING')),
  head_person_id TEXT REFERENCES person(person_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Member
CREATE TABLE IF NOT EXISTS family_member (
  family_id TEXT REFERENCES family(family_id) ON DELETE CASCADE,
  person_id TEXT REFERENCES person(person_id) ON DELETE CASCADE,
  relationship TEXT CHECK (relationship IN ('HEAD', 'SPOUSE', 'SON', 'DAUGHTER', 'PARENT', 'OTHER')),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_APPROVAL', 'REMOVED')),
  PRIMARY KEY (family_id, person_id)
);

-- Scheme
CREATE TABLE IF NOT EXISTS scheme (
  scheme_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('INDIVIDUAL', 'FAMILY')),
  rule JSONB NOT NULL DEFAULT '{}'::jsonb,
  application_mode TEXT DEFAULT 'INTERNAL' CHECK (application_mode IN ('INTERNAL', 'EXTERNAL')),
  official_application_url TEXT,
  required_information JSONB DEFAULT '[]'::jsonb,
  required_documents JSONB DEFAULT '[]'::jsonb,
  benefit_description TEXT,
  renewal_months INT DEFAULT 12,
  active BOOLEAN DEFAULT true
);

-- Eligibility Result
CREATE TABLE IF NOT EXISTS eligibility_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code TEXT REFERENCES scheme(scheme_code) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('PERSON', 'FAMILY')),
  subject_id TEXT NOT NULL,
  family_id TEXT REFERENCES family(family_id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('ELIGIBLE', 'POTENTIALLY_ELIGIBLE', 'NOT_ELIGIBLE')),
  reasons JSONB DEFAULT '[]'::jsonb,
  missing_information JSONB DEFAULT '[]'::jsonb,
  outreach_status TEXT DEFAULT 'NONE' CHECK (outreach_status IN ('NONE', 'NOTIFIED')),
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unq_eligibility_scheme_subject UNIQUE (scheme_code, subject_type, subject_id)
);

-- Application
CREATE TABLE IF NOT EXISTS application (
  application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code TEXT REFERENCES scheme(scheme_code) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('PERSON', 'FAMILY')),
  subject_id TEXT NOT NULL,
  family_id TEXT REFERENCES family(family_id) ON DELETE SET NULL,
  application_mode TEXT CHECK (application_mode IN ('INTERNAL', 'EXTERNAL')),
  application_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'STARTED' CHECK (status IN ('STARTED', 'SUBMITTED', 'UNDER_VERIFICATION', 'APPROVED', 'REJECTED', 'REFERRED')),
  submitted_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollment
CREATE TABLE IF NOT EXISTS enrollment (
  enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code TEXT REFERENCES scheme(scheme_code) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('PERSON', 'FAMILY')),
  subject_id TEXT NOT NULL,
  family_id TEXT REFERENCES family(family_id) ON DELETE SET NULL,
  status TEXT DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'BENEFIT_DELIVERED', 'ACTIVE')),
  source TEXT CHECK (source IN ('DEPARTMENT_RECORD', 'APPLICATION')),
  source_department TEXT,
  application_id UUID REFERENCES application(application_id) ON DELETE SET NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  last_benefit_date DATE,
  next_renewal_date DATE
);

-- Data Conflict (P1)
CREATE TABLE IF NOT EXISTS data_conflict (
  conflict_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  values JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolved_value TEXT,
  resolved_by TEXT,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ
);

-- Change Request (P1)
CREATE TABLE IF NOT EXISTS change_request (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('JOIN_FAMILY', 'ADD_MEMBER', 'CORRECTION')),
  requester_person_id TEXT REFERENCES person(person_id) ON DELETE CASCADE,
  family_id TEXT REFERENCES family(family_id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Identity Verification (P1 optional)
CREATE TABLE IF NOT EXISTS identity_verification (
  verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id TEXT REFERENCES person(person_id) ON DELETE CASCADE,
  verification_method TEXT DEFAULT 'MOCK_VERIFICATION_SERVICE',
  verification_status TEXT DEFAULT 'VERIFIED',
  reference_id TEXT,
  consent_status TEXT DEFAULT 'GRANTED_MOCK',
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document (mock, minimal)
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

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at TIMESTAMPTZ DEFAULT NOW(),
  actor_role TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb
);

-- -------------------------------------------------------------
-- Helper RPC: Reset Demo Data
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION reset_demo_data() RETURNS void SECURITY DEFINER AS $$
BEGIN
  TRUNCATE TABLE audit_log CASCADE;
  TRUNCATE TABLE document CASCADE;
  TRUNCATE TABLE identity_verification CASCADE;
  TRUNCATE TABLE change_request CASCADE;
  TRUNCATE TABLE data_conflict CASCADE;
  TRUNCATE TABLE enrollment CASCADE;
  TRUNCATE TABLE application CASCADE;
  TRUNCATE TABLE eligibility_result CASCADE;
  TRUNCATE TABLE family_member CASCADE;
  TRUNCATE TABLE family CASCADE;
  TRUNCATE TABLE match_review CASCADE;
  TRUNCATE TABLE source_record CASCADE;
  TRUNCATE TABLE ingestion_batch CASCADE;
  TRUNCATE TABLE person CASCADE;

  PERFORM setval('person_seq', 1, false);
  PERFORM setval('family_seq', 1, false);
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------
-- Seed Schemes with Application Config
-- -------------------------------------------------------------
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
