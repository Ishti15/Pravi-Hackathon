# Progress

## Completed Tasks
- [x] Task 1: Setup, shell, design system, demo session
- [x] Task 2: Schema, service layer, audit logging, .env.example, synthetic CSV dataset (S1-S12)
- [x] Task 3: Admin ingestion pipeline (`/admin/data-ingestion`, validation, staging `source_record`, history, demo load/reset)
- [x] Task 3B: Scheme application configuration patch (renamed `level` -> `scope`, added `application_mode`, `official_application_url`, `required_information`, `required_documents`, added `REFERRED` application status, updated `document` table, patched seed schemes & S1 Housing/Labour data).
- [x] Task 4: Normalization and light rule-based record linking (`src/lib/normalize.js`, `src/lib/similarity.js`, `src/lib/linking.js`, `src/services/personService.js`, ingestion pipeline integration, Vitest test suite on seed scenarios S2-S7).
- [x] Task 5: Officer review of ambiguous links (`/officer/identity-review`, side-by-side comparative inspection, match strength & reasons badges, approve/reject resolution, audit logging, unit tests).
- [x] Task 6: Families and Family ID (`src/lib/familyFormation.js`, `src/services/familyService.js`, `/officer/families`, `/officer/families/:id`, automatic reconciliation hooks, hold-back handling for pending reviews, unassigned persons list, Vitest test suite).
- [x] Task 7: Schemes, eligibility, benefit gaps, matrix, application routes (`src/lib/eligibility.js`, `src/lib/applicationRoute.js`, `src/lib/benefitGaps.js`, `src/lib/benefitMatrix.js`, `src/services/schemeService.js`, `src/components/BenefitMatrix.jsx`, `src/components/ApplicationRouteChip.jsx`, `/officer/benefit-gaps`, `/officer/families/:id` integration, outreach action with `OUTREACH_INITIATED` audit logging).
- [x] Task 8: Applications: internal, additional info, external referral, enrollment, duplicate prevention (`src/lib/applicationFlow.js`, `src/services/applicationService.js`, `src/components/RequirementsChecklist.jsx`, `/citizen/apply/:schemeCode`, `/officer/applications`, approval & benefit delivery flow, duplicate prevention rules with `DUPLICATE_BENEFIT_BLOCKED` audit logging, vitest test suite).
- [x] Task 9: Officer dashboard and scheme coverage (`src/lib/coverage.js`, `src/services/dashboardService.js`, `/officer/dashboard` with 9 KPI stat cards, Recharts coverage/applications/families/gaps, data integration card, `/officer/scheme-coverage` with district filter and renewals due list, vitest test suite).
- [x] Task 10: Citizen portal (`/citizen/dashboard`, `/citizen/family`, `/citizen/benefits`, `/citizen/applications`, benefit matrix, mobile-friendly tabs and route chips).
- [x] Task 11: Early deploy (Deployed to Vercel with env vars, smoke-tested live URL).

## Assumptions
- Identity verification is entirely mocked.
- Tailwind primary and accent colors chosen as per instructions (`#1F3A5F`, `#D9730D`).
- Service layer supports a dual mode: Supabase persistence when credentials are valid, with an automatic in-memory fallback for seamless offline execution.
- Synthetic datasets are deterministic (106 rows across 5 CSVs) covering 18+ families across 7 Gujarat districts.
- Scheme scopes are either `FAMILY` or `INDIVIDUAL`. Application routing modes are `INTERNAL` or `EXTERNAL`.
- Record linking follows deterministic rule hierarchy (§8): Verified identity token -> Same DOB+Gender with matching name & address (auto-link) -> Same DOB+Gender with matching name but differing address (review queue) -> New Person. Missing DOB/gender creates unlinked person flagged with `MISSING_DOB`/`MISSING_GENDER`.
- Family formation (§9): Groups persons sharing a `household_ref` (ration card). Relationships normalized to HEAD, SPOUSE, SON, DAUGHTER, PARENT, OTHER. Households with any source record in PENDING_REVIEW are held back until resolved. Income derived in priority order Food -> Housing -> Labour. Family category derived from card_type. Unassigned persons are explicitly tracked and listed for officers.

## Limitations
- Role-based access is simulated using React Context and localStorage.
