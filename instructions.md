# Family ID Gujarat — Coding Agent Instructions

> Hackathon prototype (6-hour build). **Synthetic data only.** Not an official Government of Gujarat service and not connected to UIDAI or any real government system.

---

## 0. How to work with this file

This project is built **task by task** (see §17). You will be told which task to do.

**Session start protocol**
1. Read this whole file.
2. Read `docs/PROGRESS.md` (create it in Task 1 if missing). It lists completed tasks and assumptions.
3. Inspect the repository before changing anything: structure, existing components, services, and lib modules.
4. Implement **only** the requested task. Do not start the next task, even if it looks easy.

**While implementing**
- Reuse existing components and modules. Avoid rewrites of working code.
- Keep business logic in `src/lib/` (pure functions), data access in `src/services/`, and UI in `src/pages/` + `src/components/`.
- Never hard-code datasets inside React components.
- Do not add dependencies outside the allowed list (§4) without a one-line justification in `docs/PROGRESS.md`.
- Do not change the tech stack. No Next.js, no TypeScript, no extra backend framework.
- Do not build future-only features (§19).
- **Do not gold-plate record linking (§8).** It is a supporting step. Keep it simple and move on.
- If the spec is ambiguous, choose the **simplest reading consistent with this file**, log it under "Assumptions" in `docs/PROGRESS.md`, and continue. Ask the human only if you are truly blocked.
- Time-box: if a single bug or integration issue takes more than ~15 minutes, simplify the scope, note the limitation, and move on.
- The app must stay **runnable after every task**.

**After implementing**
1. Run `npm run build`, `npm run lint`, and `npm test` (once lib tests exist). Fix anything you broke.
2. Confirm earlier features still work.
3. Update `docs/PROGRESS.md` (task status, assumptions, known limitations).
4. Reply with a concise report:
   - What was implemented
   - Files created / modified
   - Key decisions
   - How to test it (exact steps/URLs)
   - Remaining limitations or blockers

No tutorials. No long explanations. Be implementation-focused.

---

## 1. What we are building

**Family ID Gujarat – Unified Family Beneficiary Management Platform.**

Problem statement: *"Introduction of Family ID in Gujarat to improve beneficiary management for various government schemes."*

This is **not** a schemes-listing website, **not** a CRUD app, and **not** an identity-resolution system. It is a **family-centred beneficiary management platform**. The Family ID is the backbone: one record per family that links every member and every scheme they use.

```
Department records (CSV)
  → Validate → Stage → light record linking (avoid obvious duplicates)
  → Persons → Family registry → Family ID
  → Scheme eligibility → Benefit gaps + coverage
  → Applications → Enrollment → Benefit delivery → Renewal
  → Officer + Citizen services
```

**Central idea (every feature must support it):**
> A Family ID gives one unified view of a family and everything it receives from government. Officers can see who is enrolled, who is eligible but missed, and who needs renewal. Families see all their benefits in one place and can apply once, without duplication.

Record linking exists only to make Family IDs trustworthy (no obvious duplicate persons). The demo is judged on **Family ID → eligibility → gaps → applications → coverage**, not on matching sophistication.

---

## 2. Non-negotiable principles

1. **Family-level thinking.** Family ID is assigned at household level. Benefits, gaps, and coverage are viewed per family and per member.
2. **One family, one benefit.** No duplicate enrollment or duplicate in-flight application for the same scheme and subject (§12).
3. **Identity ≠ Person ID ≠ Family ID.** Flow: identity reference → internal Person ID → Family membership → Family ID. Never use an Aadhaar number (or anything derived from one) as a Person ID. Person IDs are opaque (`P000421`).
4. **Source records are immutable.** Keep names, DOBs, and addresses exactly as departments sent them (`Rameshbhai Patel` / `Ramesh Patel` / `Ramesh P Patel`). Link them to a person; never edit `source_*` fields to make records match.
5. **No silent merges.** Only clear matches auto-link. Ambiguous ones go to the officer review queue.
6. **No silent overwrites.** Conflicting values become a `data_conflict`.
7. **Explainability.** Eligibility statuses, gaps, and link decisions always show reasons.
8. **Auditability.** Every officer/admin mutation writes an `audit_log` row via one helper.
9. **Synthetic only.** No real Aadhaar numbers or citizen data. Identity verification is **mock** (label it "Mock verification"). Never claim UIDAI connectivity.
10. **Rules are data.** Eligibility rules live in `scheme.rule` JSON, not in React components.
11. **Keep four concepts separate:** Eligibility → Application → Enrollment → Benefit delivery.

---

## 3. Scope, priorities, and effort

| Priority | Items |
|---|---|
| **P0 (core demo)** | App shell, demo login, synthetic CSVs, ingestion, light record linking + review queue, persons, families, Family ID, family benefit matrix, scheme eligibility, benefit gaps, scheme coverage, application workflow with duplicate-benefit prevention, officer dashboard, citizen dashboard |
| **P1 (if time)** | Data conflicts, family updates (join / add member / correction requests), admin schemes + data-quality pages, richer charts, advanced filters |
| **P2 (nice)** | Mock document upload, audit-log viewer polish |
| **Future only** | See §19 |

**Where effort should go**

| Area | Share |
|---|---|
| Family registry: formation, Family ID, family profile, benefit matrix | ~25% |
| Eligibility, benefit gaps, scheme coverage | ~25% |
| Applications and enrollment (incl. duplicate-benefit prevention, renewals) | ~20% |
| Officer and citizen dashboards | ~20% |
| Ingestion + record linking | ~10% |

Not every route in §15 must exist. **Prioritize the end-to-end demo (§18) over breadth.**

---

## 4. Tech stack and constraints

- **Frontend:** React (JavaScript, **no TypeScript**), Vite, Tailwind CSS, `react-router-dom`.
- **Data:** Supabase (Postgres, optional Storage) via `@supabase/supabase-js`.
- **Deployment:** Vercel (frontend only). Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **No separate backend.** Pipeline logic (normalization, linking, family formation, eligibility, gaps, matrix) is pure JS in `src/lib/`, called from `src/services/`, which persist results to Supabase. Data sizes are small (~100–150 records). Production would move this server-side. Note this in the architecture diagram.
- **Allowed dependencies:** `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`, `tailwindcss` (+ postcss/autoprefixer), `papaparse`, `recharts`, `lucide-react`, `vitest` (dev), `clsx`. Anything else needs justification.
- **Database changes:** Write SQL to `supabase/schema.sql` (tables, sequences, `reset_demo_data()` RPC, scheme seed). The human runs it in the Supabase SQL editor. Do not assume database access.
- **RLS:** Disabled for the prototype (synthetic data, demo sessions). Mention RBAC/RLS in the future architecture.
- **Fallback:** Only `src/services/` may touch Supabase. If Supabase setup blocks progress for more than ~20 minutes, implement an in-memory store behind the same service interfaces and tell the human.

**Suggested structure**
```
src/
  lib/            normalize.js, similarity.js, linking.js, familyFormation.js, eligibility.js,
                  benefitGaps.js, benefitMatrix.js, coverage.js, applicationFlow.js, config/
  services/       supabaseClient.js, ingestionService.js, personService.js, familyService.js,
                  reviewService.js, schemeService.js, applicationService.js, conflictService.js,
                  auditService.js, dashboardService.js, demoService.js
  components/     AppShell, Sidebar, PageHeader, StatCard, DataTable, StatusBadge,
                  MatchStrengthBadge, ReasonList, BenefitMatrix, Timeline, EmptyState,
                  ConfirmDialog, FamilyCard, ...
  pages/          public/, citizen/, officer/, admin/
  session/        demo session context (role + linked person)
public/sample-data/  health.csv, education.csv, food.csv, labour.csv, housing.csv
supabase/schema.sql
docs/PROGRESS.md, docs/SEED_SCENARIOS.md
```

**Commands:** `npm run dev`, `npm run build`, `npm run lint`, `npm test`.

---

## 5. Actors and (demo) authentication

Three actors: **Citizen**, **Government Officer**, **Administrator**.

**Prototype auth = demo session, not real auth.** The landing page (`/` and `/login`) shows three "Enter demo as…" cards:
- Citizen (linked to the hero person, Rameshbhai Patel)
- Officer
- Admin

Role and `person_id` live in a React context persisted to `localStorage`. Route guards enforce role access in the UI. Show a "Demo session" indicator and a role switcher. Real Supabase Auth, mobile OTP, and RBAC/RLS are **architecture-only** (§19).

**Capabilities**
- **Citizen:** view Family ID, members, personal info; see the family benefit matrix, eligibility and reasons; apply for schemes; track applications and benefits; (P1) request correction / add member / join family; (P2) documents.
- **Officer:** dashboard; search persons/families; family profiles with benefit matrix; review ambiguous record links; review applications; benefit gaps and outreach; scheme coverage and renewals; (P1) resolve data conflicts and approve family-update requests.
- **Admin:** upload department CSVs; ingestion history and stats; view scheme definitions; system analytics.

---

## 6. Data model

Keep it lean. IDs come from Postgres sequences: `P000001`, `FAM-GJ-000001`. Enums are `text` with CHECK constraints.

| Table | Key fields |
|---|---|
| **person** | `person_id` (PK, `P######`), `canonical_name`, `dob`, `gender` (M/F/O), `occupation`, `is_student`, `education_class`, `identity_status` (VERIFIED/UNVERIFIED), `identity_reference` (synthetic), `data_flags` (jsonb array, e.g. `["MISSING_DOB"]`), `created_at`, `updated_at` |
| **source_record** | `source_record_id` (uuid), `batch_id`, `department`, `source_key` (dept's record id; unique with department), `source_person_name`, `source_dob` (nullable), `source_gender`, `source_address`, `district`, `source_identifier` (synthetic identity ref), `household_ref`, `relationship_to_head`, `father_or_spouse_name`, `attributes` (jsonb: income, occupation, card_type, housing_status, scheme flags, class…), `raw` (jsonb, original row), `normalized_name`, `person_id` (null until linked), `match_method` (VERIFIED_ID / AUTO_LINK / OFFICER_APPROVED / NEW_PERSON / PENDING_REVIEW), `match_strength` (VERIFIED/HIGH/MEDIUM/null), `created_at` |
| **ingestion_batch** | `batch_id`, `department`, `file_name`, `uploaded_at`, `total_rows`, `imported_rows`, `error_rows`, `errors` (jsonb), `linked_records`, `review_queued`, `new_persons`, `duplicates_in_file`, `conflicts_detected` |
| **match_review** | `review_id`, `source_record_id`, `candidate_person_id`, `strength`, `reasons` (jsonb), `status` (PENDING/APPROVED/REJECTED), `reviewed_by`, `reviewed_at`, `note` |
| **family** | `family_id` (PK, `FAM-GJ-######`), `household_ref`, `address`, `district`, `taluka`, `city_or_village`, `household_income`, `income_source`, `family_category`, `family_status` (ACTIVE/PENDING), `head_person_id`, timestamps |
| **family_member** | `family_id`, `person_id`, `relationship` (HEAD/SPOUSE/SON/DAUGHTER/PARENT/OTHER), `status` (ACTIVE/PENDING_APPROVAL/REMOVED). PK (family_id, person_id) |
| **scheme** | `scheme_code`, `name`, `department`, `description`, `level` (PERSON/FAMILY), `rule` (jsonb), `benefit_description`, `renewal_months`, `active` |
| **eligibility_result** | `id`, `scheme_code`, `subject_type` (PERSON/FAMILY), `subject_id`, `family_id`, `status` (ELIGIBLE/POTENTIALLY_ELIGIBLE/NOT_ELIGIBLE), `reasons` (jsonb), `missing_information` (jsonb), `outreach_status` (NONE/NOTIFIED), `evaluated_at`. Unique (scheme_code, subject_type, subject_id) |
| **application** | `application_id`, `scheme_code`, `subject_type`, `subject_id`, `family_id`, `status`, `submitted_at`, `decision_note`, timestamps |
| **enrollment** | `enrollment_id`, `scheme_code`, `subject_type`, `subject_id`, `family_id`, `status`, `source` (DEPARTMENT_RECORD/APPLICATION), `source_department`, `application_id`, `enrolled_at`, `last_benefit_date`, `next_renewal_date` |
| **data_conflict** *(P1)* | `conflict_id`, `entity_type`, `entity_id`, `field_name`, `values` (jsonb: `[{department, value, source_record_id}]`), `status` (OPEN/RESOLVED), `resolved_value`, `resolved_by`, `resolution_note`, `resolved_at` |
| **change_request** *(P1)* | `request_id`, `type` (JOIN_FAMILY/ADD_MEMBER/CORRECTION), `requester_person_id`, `family_id`, `payload`, `status`, `reviewed_by`, `note`, timestamps |
| **identity_verification** *(P1, optional)* | `verification_id`, `person_id`, `verification_method` (MOCK_VERIFICATION_SERVICE), `verification_status`, `reference_id`, `consent_status` (GRANTED_MOCK), `verified_at` |
| **document** *(P2)* | `document_id`, `person_id`, `application_id`, `doc_type`, `file_name`, `storage_path`, `verification_status` |
| **audit_log** | `audit_id`, `at`, `actor_role`, `actor_name`, `action`, `entity_type`, `entity_id`, `details` (jsonb) |

`schema.sql` must also define `reset_demo_data()` (truncate data tables, restart sequences) and seed the `scheme` rows.

Identity status is derived: a person is `VERIFIED` if any linked source record carries a synthetic identity reference, otherwise `UNVERIFIED`. Show it as a badge.

---

## 7. Synthetic data

Five CSVs in `public/sample-data/`, each in its **own department format** (different column names, mixed date formats `DD/MM/YYYY` and `YYYY-MM-DD`, Gujarati-style names).

| Department | File | Columns |
|---|---|---|
| Health | `health.csv` | record_id, name, dob, gender, address, district, mobile, father_or_spouse_name, health_scheme_enrolled (Y/N), identity_ref |
| Education | `education.csv` | record_id, student_name, dob, gender, father_name, address, district, school, class, scholarship_enrolled (Y/N), identity_ref |
| Food & Civil Supplies | `food.csv` | record_id, ration_card_no, member_name, dob, gender, relationship_to_head, address, district, annual_income, card_type (PRIORITY/GENERAL), identity_ref |
| Labour | `labour.csv` | record_id, worker_name, dob, gender, address, district, occupation, annual_income, worker_scheme_enrolled (Y/N), identity_ref |
| Housing | `housing.csv` | record_id, applicant_name, dob, gender, address, district, annual_income, housing_status (KUTCHA/PUCCA/NONE), housing_scheme_enrolled (Y/N), identity_ref |

`ration_card_no` (Food) is the `household_ref` used to group families. `identity_ref` is a **synthetic** token (e.g. `SYN-ID-000421`) present on only some records.

**Volume:** ~100–120 source records → ~60–70 persons → ~18–20 families across several Gujarat districts.

**Deterministic, hand-designed data (no runtime randomness).** Task 2 documents which record IDs realize each scenario in `docs/SEED_SCENARIOS.md`.

| # | Scenario | Expected outcome |
|---|---|---|
| S1 | **Hero Patel family** (Kalol, Gandhinagar): Rameshbhai Patel (M, 12/05/1980, head), Meena Patel (F, 03/09/1984), Rahul Patel (M, 20/02/2011, student), Priya Patel (F, 15/07/2014, student). Family income consistent (~₹1,80,000). Rahul not enrolled in Student Education Assistance. Priya already enrolled (Education flag = Y). Family not enrolled in Family Health Cover. | Family formed; Rahul's STU-EDU and the family's FAM-HEALTH are **benefit gaps**; Priya shows enrolled |
| S2 | Health "Rameshbhai Patel" vs Labour "Ramesh Patel": same DOB, gender, address | **Auto-linked** |
| S3 | Food "Ramesh P Patel" (carries the ration card): same DOB and gender, different (older) address | **Review queue**. After officer approval the Patel family forms |
| S4 | **Trap:** a different "Ramesh Patel" (M, 02/11/1975, Mehsana) | Never linked to the hero |
| S5 | Meena as "Meena Patel" and "Meenaben R Patel", same `identity_ref` | Linked via identity reference |
| S6 | Record with missing DOB | Never auto-links; new person flagged `MISSING_DOB` |
| S7 | Identical duplicate row inside one department file | Counted in `duplicates_in_file`; links to the same person |
| S8 | **Solanki family:** income ₹2,00,000 (Labour) vs ₹3,50,000 (Food) | Data conflict (P1); until resolved, income-based eligibility is Potentially Eligible |
| S9 | 2–3 persons with no `household_ref` | Stay **Unassigned** (used for join-family, P1) |
| S10 | A family with missing income | Potentially Eligible with missing information listed |
| S11 | A **fully enrolled** family; one enrollment with renewal due soon | No gaps; one **Renewal Due**; an attempt to re-apply is blocked (§12) |
| S12 | A family enrolled in a family-level scheme via one department | "Already enrolled via <Department>" shown on Apply |

Add ordinary families so tables and charts look realistic. Provide "Load demo dataset" (runs all five CSVs through the real pipeline) and "Reset demo data" (calls `reset_demo_data()`).

---

## 8. Ingestion and record linking

### Pipeline
`CSV upload → validate → stage (source_record, raw preserved) → normalize → link to persons → reconcile families → evaluate eligibility`

- **Validate:** required columns per department, parseable dates, valid gender. Bad rows are reported per row (row number + reason) and do not abort the batch.
- **Idempotency:** unique on (department, source_key). Re-uploading a file must not create duplicates. Skip and count them.
- **Normalization** produces derived fields (`normalized_name`, parsed dob, gender, address tokens). It never modifies `source_*` fields.
- `reconcileFamilies()` and `evaluateAll()` are **idempotent and re-runnable**. They run after ingestion and after an officer approves a link.

### Name normalization
Lowercase, remove punctuation, collapse spaces, strip honorifics (shri, smt, mr, mrs), strip trailing `bhai` / `ben` from tokens (`Rameshbhai` → `ramesh`). A single-letter token is an **initial** and matches any token starting with that letter.

### Record linking (lightweight, `src/lib/linking.js`)
Keep this simple: rule-based, no weighted scoring, no fuzzy library. Constants sit at the top of the file.

A **candidate person** must share the same DOB **and** gender with the incoming record. If DOB or gender is missing there are no candidates: create a new person flagged `MISSING_DOB` (or `MISSING_GENDER`).

Evaluate in order:
1. **Same identity reference** → link. Method `VERIFIED_ID`, strength `VERIFIED`.
2. **Names match** (token by token: equal, initial-compatible, or edit distance ≤ 1) **and addresses match** (same district plus at least two shared address tokens, or same village/city) → **auto-link**. Method `AUTO_LINK`, strength `HIGH`.
3. **Names match but addresses differ** → **officer review**. Method `PENDING_REVIEW`, strength `MEDIUM`.
4. Otherwise → `NEW_PERSON`.

Every decision returns `{ decision, strength, reasons[] }`, e.g. `"Names match after normalization (Ramesh P Patel ~ Ramesh Patel)"`, `"Same DOB and gender"`, `"Address differs: Sabarmati vs Kalol"`. Show reasons and a strength badge in the UI. No numeric confidence.

### Person creation
`NEW_PERSON` creates a `person`. Canonical name = the longest name variant without initials (`Rameshbhai Patel`). Occupation, `is_student`, and class come from linked source records. All source records stay linked and visible for provenance.

### Officer review (small)
Show the incoming record next to the candidate person's source records, the reasons, and the strength badge. **Approve** links the record (`OFFICER_APPROVED`) and triggers `reconcileFamilies()` + `evaluateAll()`. **Reject** creates a new person. Both are audited.

---

## 9. Family model and Family ID

A **Person is not a Family.** A Family groups persons by relationship. The Family ID (`FAM-GJ-000123`) is assigned at household level and is the key that everything else hangs off.

**Family formation (`reconcileFamilies`)**
1. Persons whose linked source records share a `household_ref` (ration card) form one family. Relationship comes from `relationship_to_head`, mapped to HEAD/SPOUSE/SON/DAUGHTER/PARENT/OTHER.
2. Family fields: address/district/taluka/city from the head's records; `household_income` from Food → Housing → Labour (priority order) with `income_source` recorded; `family_category` from `card_type`.
3. Persons without a household reference stay **Unassigned** and are listed for officers. Do not guess families.
4. If any source record carrying a `household_ref` is still pending review, hold the whole household back (do not form the family yet) until the review is resolved, so the family forms complete.
5. New family → generate Family ID → audit `FAMILY_CREATED`.

**Family profile (officer and citizen)** shows: Family ID, address/district, category, head, members with relationships and verification badges, the **benefit matrix** (§11), enrollments, applications, and the source-record provenance for each member.

**Family updates (P1):** a citizen must not create a duplicate family. Flow: find existing person → find existing family → if a match exists, create a `JOIN_FAMILY` change request for officer approval → otherwise create a new family and Family ID. Add-member and correction requests use the same `change_request` flow.

---

## 10. Schemes and eligibility engine

**Six illustrative schemes** (synthetic names and thresholds; never present them as real government rules). Seeded in `schema.sql`.

| Code | Name | Level | Conditions |
|---|---|---|---|
| `STU-EDU` | Student Education Assistance | PERSON | age 6–18, is_student, family income < ₹3,00,000 |
| `GIRL-CHILD` | Girl Child Support | PERSON | female, age < 18, family income < ₹3,00,000 |
| `FAM-HEALTH` | Family Health Cover | FAMILY | family income < ₹5,00,000 |
| `FOOD-SEC` | Food Security Support | FAMILY | family income < ₹2,50,000 **or** card_type = PRIORITY |
| `HOUSING` | Housing Assistance | FAMILY | housing_status in (KUTCHA, NONE), family income < ₹3,00,000 |
| `LABOUR-WELFARE` | Registered Worker Welfare | PERSON | age 18–60, occupation in labour categories |

**Rule format (`scheme.rule`)**
```json
{
  "logic": "ALL",
  "conditions": [
    { "fact": "age", "op": "between", "value": [6, 18], "label": "Age between 6 and 18" },
    { "fact": "is_student", "op": "eq", "value": true, "label": "Currently a student" },
    { "fact": "family_income", "op": "lt", "value": 300000, "label": "Family income below ₹3,00,000", "needs_verified": true }
  ]
}
```
Operators: `eq, neq, lt, lte, gt, gte, between, in`. `logic` is `ALL` or `ANY` (`FOOD-SEC` needs `ANY`).

**Engine (`src/lib/eligibility.js`, pure)**
- `buildFacts(person, family, sourceRecords, openConflicts)` → `age`, `gender`, `is_student`, `occupation`, `family_income`, `card_type`, `housing_status`.
- Each condition is `MET`, `NOT_MET`, or `UNKNOWN` (fact is null, **or** `needs_verified` and the fact has an open data conflict).
- Status: any `NOT_MET` → `NOT_ELIGIBLE`; else any `UNKNOWN` → `POTENTIALLY_ELIGIBLE`; else `ELIGIBLE`. (For `ANY` logic, any `MET` → `ELIGIBLE`.)
- Return `{ status, reasons[], missing_information[] }`, e.g.
```
status: POTENTIALLY_ELIGIBLE
reasons: ["Age requirement satisfied", "Student requirement satisfied"]
missing_information: ["Income verification required"]
```
- Persist to `eligibility_result`. `evaluateAll()` upserts (idempotent) and accepts open conflicts (empty until Task 12).
- The UI always shows reasons and missing information next to the status.

---

## 11. Benefit gaps, coverage, and the benefit matrix

This is the core of "improving beneficiary management".

**Benefit gap** = `ELIGIBLE` + no enrollment + no in-flight application (STARTED / SUBMITTED / UNDER_VERIFICATION) for the same subject and scheme. Pure function in `src/lib/benefitGaps.js`.
- Officer `/officer/benefit-gaps`: table with person/family, scheme, Family ID, district, reasons, and **"Initiate outreach"** (sets `outreach_status = NOTIFIED`, audit `OUTREACH_INITIATED`; mock only, no SMS).
- Optionally show `POTENTIALLY_ELIGIBLE` separately as "Needs verification".
- Citizen: "Schemes you may be missing" with Apply.

**Family benefit matrix** (`src/lib/benefitMatrix.js`, `BenefitMatrix` component): rows = each family member (for PERSON-level schemes) plus a "Family" row (for FAMILY-level schemes); columns = schemes; each cell is one of `ENROLLED`, `RENEWAL_DUE`, `GAP` (eligible, not enrolled), `IN_PROGRESS`, `POTENTIAL`, `NOT_ELIGIBLE`, or `N/A`. Cells show a colored badge and open the reasons on click. Used on the officer family profile and the citizen family/benefits page. **This is the signature Family ID screen. Make it clear and polished.**

**Scheme coverage** (`src/lib/coverage.js`, officer `/officer/scheme-coverage`): per scheme: enrolled, gaps, in progress, needs verification, **coverage % = enrolled / (enrolled + gaps)**; a district filter; and a **renewals due** list (enrollments with `next_renewal_date` within 30 days).

---

## 12. Applications, enrollment, and benefits

**Application status:** `STARTED → SUBMITTED → UNDER_VERIFICATION → APPROVED | REJECTED`

| Actor | Allowed transitions |
|---|---|
| Citizen | create (STARTED), STARTED → SUBMITTED |
| Officer | SUBMITTED → UNDER_VERIFICATION, UNDER_VERIFICATION → APPROVED / REJECTED (rejection requires a note) |

**Enrollment status:** `ENROLLED → BENEFIT_DELIVERED → ACTIVE`, with `RENEWAL_DUE` derived when `next_renewal_date` is within 30 days.
- On **APPROVED**: create an enrollment (`ENROLLED`, source `APPLICATION`).
- Officer "Mark benefit delivered": sets `BENEFIT_DELIVERED`, records `last_benefit_date`, sets `next_renewal_date` (from `renewal_months`), then status becomes `ACTIVE`. Mock only, no real DBT.
- Enrollments can also come from department flags (`*_enrolled = Y`, source `DEPARTMENT_RECORD`, with `source_department`).
- Citizen can apply when eligibility is `ELIGIBLE` or `POTENTIALLY_ELIGIBLE` (the latter shows missing information). `NOT_ELIGIBLE` shows reasons and disables Apply.

**One family, one benefit (duplicate-benefit prevention)**
- FAMILY-level schemes: the subject is the family. If the family is already enrolled (from any department or application), Apply is disabled and the UI shows *"Already enrolled via <Department/Application> on <date>"*.
- PERSON-level schemes: at most one live enrollment per person per scheme.
- A STARTED / SUBMITTED / UNDER_VERIFICATION application blocks a second application for the same subject and scheme.
- `applicationService` enforces this in the service layer, not only in the UI, so it cannot be bypassed. A blocked attempt writes audit `DUPLICATE_BENEFIT_BLOCKED`.

Transition and duplicate rules live in `src/lib/applicationFlow.js` (pure, tested). Every transition writes an audit row, and the citizen timeline is built from those entries.

---

## 13. Data conflicts (P1)

Detect after linking: differing `income` across linked source records of a family (difference > 10%) and differing DOB across records of a person.

Officer can: view all values with source department, choose or enter the verified value, add a note, and resolve. Resolution updates the canonical/family value, keeps all source records untouched, writes audit `CONFLICT_RESOLVED`, and triggers `evaluateAll()`.

While a conflict is OPEN, conditions with `needs_verified` on that fact evaluate to `UNKNOWN` (Potentially Eligible, "Income verification required"). `evaluateAll()` accepts open conflicts from Task 7 onward (empty until Task 12).

---

## 14. Audit log

Single helper: `auditService.log({ actor_role, actor_name, action, entity_type, entity_id, details })`. Call it from **every** mutating service function.

Actions: `DATA_INGESTED, AUTO_LINKED, IDENTITY_MATCH_APPROVED, IDENTITY_MATCH_REJECTED, FAMILY_CREATED, FAMILY_MEMBER_ADDED, APPLICATION_STATUS_CHANGED, BENEFIT_DELIVERED, DUPLICATE_BENEFIT_BLOCKED, CONFLICT_RESOLVED, OUTREACH_INITIATED, DEMO_RESET`.

A viewer (table or activity feed on family/application pages) is P2. The logging itself is required early.

---

## 15. Pages

| Route | Priority | Purpose |
|---|---|---|
| `/`, `/login` | P0 | Landing + "Enter demo as…" role cards, 3-line pitch |
| `/citizen/dashboard` | P0 | **Family ID prominent**, family summary, benefit matrix summary, schemes you may be missing, pending applications, recent activity |
| `/citizen/family` | P0 | Members, relationships, verification badges, full benefit matrix |
| `/citizen/benefits` | P0 | Eligibility with reasons, enrolled schemes, renewals, Apply |
| `/citizen/applications` | P0 | Tracking timeline |
| `/citizen/documents` | P2 | Mock upload |
| `/officer/dashboard` | P0 | **Key demo screen**, see below |
| `/officer/families`, `/officer/families/:id` | P0 | Search/filter families; profile with members, benefit matrix, enrollments, applications, provenance, unassigned persons list |
| `/officer/scheme-coverage` | P0 | Coverage per scheme, district filter, renewals due |
| `/officer/benefit-gaps` | P0 | Gaps table + outreach |
| `/officer/applications` | P0 | Review, verify, approve/reject, mark benefit delivered |
| `/officer/identity-review` | P0 | Small queue of ambiguous record links (§8) |
| `/officer/data-conflicts` | P1 | Conflict resolution |
| `/admin/data-ingestion` | P0 | Upload CSV, history, per-batch summary, "Load demo dataset", "Reset" |
| `/admin/dashboard`, `/admin/schemes`, `/admin/data-quality` | P1 | Analytics, read-only scheme rules, quality stats |

**Officer dashboard**
- Stat cards: Total Families, Total Persons, Verified Persons, Active Beneficiaries, Potential Beneficiaries, Pending Applications, Renewals Due, Benefit Gaps, Open Data Conflicts, plus a small "Records awaiting review" chip.
- Charts (recharts): **coverage by scheme** (enrolled vs gaps), applications by status, families by district, benefit gaps by scheme, beneficiaries by scheme.
- A small "Data integration" card shows the last ingestion result (imported / linked / review / new). Keep it minor.
- Every card and chart links to its detail page.

**Ingestion summary** (after each upload): file name, department, imported, errors, linked, review-queued, new persons, duplicates in file, conflicts.

---

## 16. UI/UX direction

Serious government digital-service feel. **Not** a flashy startup page, a student CRUD app, or an animation-heavy dashboard.

- **Palette:** deep navy primary (`#1F3A5F`), saffron accent (`#D9730D`, sparingly), neutral grays, white surfaces. Status colors: green (eligible/approved/active/enrolled), amber (potential/pending/review/renewal due), red (rejected/not eligible/conflict), blue (info/submitted/in progress).
- **Type:** Inter or system UI. Clear hierarchy and readable table density.
- **Components:** one `StatusBadge` with a central status→color map; `MatchStrengthBadge`; `ReasonList`; `BenefitMatrix`; `Timeline`; `StatCard`; `DataTable` with search, filter, empty state.
- Every page has loading, empty, and error states. Clear button labels, focus styles, accessible contrast.
- **Responsive:** citizen pages must work well on mobile; officer/admin are desktop-first but must not break on tablet.
- **Always visible:** slim banner *"Prototype — synthetic data only. Not an official Government of Gujarat service."* Do not use the state emblem or official logos.
- Use Gujarat context in copy and data: District, Taluka, Village/City, Family ID, Department, Scheme, Beneficiary. UI in English (an optional Gujarati subtitle in the header is fine).
- Minimal animation (subtle transitions only).

---

## 17. Task plan

Each task must leave the app runnable and meet its acceptance criteria. Times are targets for planning. If behind, drop P1/P2 tasks first. **Reserve the last ~40 minutes for Tasks 15–16.**

### Core (P0), about 4h40

**Task 1 — Setup, shell, design system, demo session (~20 min)**
Vite + React + Tailwind + router; AppShell with role-aware sidebar; demo session context and route guards; landing page with role cards; prototype banner; base components (StatCard, StatusBadge, DataTable, PageHeader, EmptyState); `docs/PROGRESS.md`; `npm test` runs (vitest).
*Accept:* build/lint pass; each role reaches its own placeholder dashboard; a citizen cannot open officer routes.

**Task 2 — Schema, synthetic data, service layer (~30 min)**
`supabase/schema.sql` (tables, sequences, `reset_demo_data()`, scheme seed); five CSVs per §7; `docs/SEED_SCENARIOS.md`; `supabaseClient.js`, `auditService`, `demoService`; `.env.example`.
*Accept:* schema runs cleanly; CSVs contain scenarios S1–S12; a service call round-trips a row; audit rows can be written.

**Task 3 — Admin ingestion (~30 min)**
`/admin/data-ingestion`: upload CSV, choose department, parse (papaparse), validate, stage `source_record` with `raw` preserved, create `ingestion_batch`, result summary, history table, "Load demo dataset", "Reset". Linking counters may read 0 until Task 4.
*Accept:* all five CSVs import; bad rows reported with row numbers; re-upload creates no duplicates; no `source_*` field altered.

**Task 4 — Normalization and light record linking (~20 min)**
`normalize.js`, `similarity.js` (token equality + edit distance ≤ 1 only), `linking.js` per §8; create persons, links, and `match_review` rows; update batch counters. Keep it simple.
*Accept (vitest on seed data):* S2 auto-linked; S3 → review; S4 not linked to the hero; S5 linked via identity reference; S6 not auto-linked and flagged; S7 counted. Reasons returned for every decision.

**Task 5 — Officer review of ambiguous links (~15 min)**
`/officer/identity-review`: queue, side-by-side source records, strength badge, reasons, approve/reject, audit. Approval triggers pipeline re-run.
*Accept:* approving S3 links the record and clears it from the queue; audit rows exist; source records unchanged.

**Task 6 — Families and Family ID (~30 min)**
`familyFormation.js` + `reconcileFamilies()`; Family IDs; `/officer/families` (search, filter by district) and `/officer/families/:id` (members, provenance, unassigned persons list).
*Accept:* Patel family exists with 4 members after S3 is approved; ID format `FAM-GJ-######`; unassigned persons listed; re-running creates no duplicates.

**Task 7 — Schemes, eligibility, gaps, benefit matrix (~40 min)**
Scheme service; `eligibility.js` (`needs_verified` support), `benefitGaps.js`, `benefitMatrix.js`, `evaluateAll()`; enrollments from department flags; `/officer/benefit-gaps` with outreach; `BenefitMatrix` on the officer family profile; `ReasonList`.
*Accept (vitest):* Rahul STU-EDU eligible + gap; Priya enrolled (no gap); hero family FAM-HEALTH gap; S10 potentially eligible with missing info; every result has reasons; matrix renders correct cell states for the Patel family.

**Task 8 — Applications, enrollment, duplicate-benefit prevention (~30 min)**
`applicationFlow.js` (+ tests); citizen apply/submit; `/officer/applications` review; benefit delivery; audit timeline; duplicate-benefit rules (§12).
*Accept:* full path Eligible → Started → Submitted → Under Verification → Approved → Enrolled → Delivered → Active; invalid transitions rejected; gap disappears once an application is in flight; S11/S12 re-apply blocked with the "Already enrolled via…" message and an audit row.

**Task 9 — Officer dashboard and scheme coverage (~30 min)**
`dashboardService`, `coverage.js`; dashboard cards + charts + links (§15); `/officer/scheme-coverage` with renewals due.
*Accept:* numbers match the detail pages; coverage % = enrolled / (enrolled + gaps); dashboard renders with empty data too.

**Task 10 — Citizen portal (~25 min)**
`/citizen/dashboard`, `/family`, `/benefits`, `/applications` for the demo citizen; benefit matrix on family page; mobile-friendly.
*Accept:* citizen sees Family ID, members, matrix, eligibility with reasons, gaps with Apply, and live application status updated by the officer.

**Task 11 — Early deploy (~10 min)**
Deploy to Vercel with env vars; smoke-test the whole demo on the live URL.
*Accept:* live URL works end to end. **From here a working version always exists.**

### Stretch (P1/P2, drop if behind)

**Task 12 — Data conflicts (~20 min):** detection, `/officer/data-conflicts`, resolution, conflict-aware eligibility, audit. *Accept:* S8 goes Potentially Eligible → resolved → re-evaluated.

**Task 13 — Family updates (~20 min):** join-family, add-member, correction requests (use S9 persons), officer approval, audit. *Accept:* an unassigned person requests to join, the officer approves, and the family shows the new member.

**Task 14 — Documents (mock), admin schemes/data-quality pages, chart polish (~15 min).**

### Final (mandatory)

**Task 15 — Integration and polish (~25 min):** run the full demo (§18) from a clean reset; fix seams, empty/loading/error states, responsiveness, copy; remove dead code and console noise.

**Task 16 — Final deploy (~10 min):** production build, deploy, verify reset + full demo on the live URL, update the README with run and demo instructions.

---

## 18. Demo flow (definition of done)

1. Admin opens Data Ingestion and loads the five department CSVs. The summary shows imported rows, errors, records linked, and cases needing review.
2. Most records link automatically; one ambiguous case ("Ramesh P Patel") lands in the officer review queue.
3. Officer reviews it (sees reasons and source records) and approves.
4. The Patel family is formed and receives a Family ID, with members and relationships.
5. Officer opens the family profile: the **benefit matrix** shows what each member is enrolled in and where the gaps are.
6. Eligibility is evaluated with reasons. Rahul and the family health cover show as **benefit gaps**.
7. Officer dashboard and **scheme coverage** show enrolled vs gaps, applications, renewals due.
8. Officer initiates outreach on a gap.
9. Citizen opens the Family Portal: Family ID, members, matrix, "schemes you may be missing".
10. Citizen applies for Student Education Assistance for Rahul.
11. Officer reviews the application, moves it to Under Verification, then Approves.
12. Enrollment is created; officer marks benefit delivered.
13. Citizen sees the updated status and the matrix cell turn to Enrolled.
14. Citizen tries to apply again (or applies to an already-enrolled family scheme) and is **blocked**: "Already enrolled".

The demo must also run from a **pre-loaded state** ("Load demo dataset") so it can be shown reliably in a few minutes.

---

## 19. Future-only (show in the architecture diagram, do not build)

Real UIDAI/e-KYC integration and consent management; real department APIs and an integration gateway; DigiLocker; OCR; ML-based entity resolution at state scale; real authentication (mobile OTP), RBAC and Postgres RLS; encryption and secure document storage; SMS/WhatsApp/IVR outreach; multilingual voice assistant; DBT payment integration; offline field app; predictive analytics; server-side processing pipeline and queues.

---

## 20. Security and privacy

Synthetic prototype. Never use real Aadhaar numbers or real citizen information; never store Aadhaar as a Person ID; never imply a UIDAI connection; never expose sensitive personal data. Production would need authorized identity verification, consent management, encryption, RBAC, audit trails, data minimization, secure document storage, and government API integration. Reflect these in the architecture, not in extra code.
