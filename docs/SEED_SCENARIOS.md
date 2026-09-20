# Seed Scenarios Mapping (S1 – S12)

This document maps the synthetic dataset records in `public/sample-data/` to the evaluation scenarios described in §7 and §10.

---

### Scenario S1: Hero Patel Family Formation, Eligibility & Application Routing
- **District:** Kalol, Gandhinagar
- **Ration Card:** `GJ-RC-100001`
- **Family Income:** ₹1,80,000 (Consistent across records)
- **Members & Records:**
  - **Rameshbhai Patel (Head, M, 12/05/1980):** 
    - `HLT-0001` (Health: `health_scheme_enrolled=N`, `SYN-ID-000001`)
    - `LAB-0001` (Labour: `occupation=LABOUR`, `annual_income=180000`, `worker_scheme_enrolled=N`)
    - `FOOD-0001` (Food: `HEAD`, `45 Old Wada, Sabarmati`, review queue)
    - `HSG-0001` (Housing: `housing_status=KUTCHA`, `housing_scheme_enrolled=N`, `SYN-ID-000001`)
  - **Meena Patel (Spouse, F, 03/09/1984):** `HLT-0002`, `FOOD-0002` (`SYN-ID-000002`)
  - **Rahul Patel (Son, M, 20/02/2011, Student):** `HLT-0003`, `EDU-0001` (`scholarship_enrolled=N`), `FOOD-0003` (`SYN-ID-000003`)
  - **Priya Patel (Daughter, F, 15/07/2014, Student):** `HLT-0004`, `EDU-0002` (`scholarship_enrolled=Y`), `FOOD-0004` (`SYN-ID-000004`)
- **Expected Outcome:**
  - Family formed with 4 members under Family ID.
  - **Rahul (`STU-EDU`):** Eligible + Benefit Gap. Route: `APPLY_HERE` (Internal pre-filled review + consent).
  - **Priya (`GIRL-CHILD`):** Eligible + Benefit Gap. Route: `ADDITIONAL_INFO_REQUIRED` (Needs bank account last 4 digits + birth certificate).
  - **Priya (`STU-EDU`):** Enrolled (no gap).
  - **Family (`FAM-HEALTH`):** Eligible + Benefit Gap. Route: `APPLY_HERE` (Internal pre-filled review + consent).
  - **Family (`HOUSING`):** Eligible + Benefit Gap (Kutcha house, income < ₹3,00,000). Route: `EXTERNAL_PORTAL` (Referral to official portal with required documents checklist).
  - **Ramesh (`LABOUR-WELFARE`):** Eligible + Benefit Gap (Labour occupation, age 18–60). Route: `EXTERNAL_PORTAL`.

---

### Scenario S2: Direct Record Auto-Linking
- **Records:** `HLT-0001` (Health: Rameshbhai Patel, 12/05/1980, M, Kalol) and `LAB-0001` (Labour: Ramesh Patel, 1980-05-12, M, Kalol)
- **Condition:** Exact normalized name match, identical DOB, identical gender, matching Kalol address.
- **Expected Outcome:** Auto-linked with method `AUTO_LINK` and strength `HIGH`.

---

### Scenario S3: Ambiguous Address Match (Review Queue)
- **Records:** `FOOD-0001` (Food: Ramesh P Patel, 12/05/1980, M, 45 Old Wada, Sabarmati, Ahmedabad) vs `HLT-0001` (12 Shivam Society, Kalol, Gandhinagar)
- **Condition:** Matching normalized name and DOB, but different older address/district.
- **Expected Outcome:** Placed in Officer Review Queue with strength `MEDIUM` (`PENDING_REVIEW`). Upon officer approval, links to Rameshbhai Patel and unlocks Patel family formation.

---

### Scenario S4: Identity Trap (Different Person with Same Name)
- **Records:** `HLT-0005` & `FOOD-0005` (Ramesh Patel, M, 02/11/1975, 7 Gayatri Nagar, Mehsana)
- **Condition:** Name is Ramesh Patel, but DOB (02/11/1975) and location (Mehsana) differ from Hero Patel.
- **Expected Outcome:** Form a distinct person in Mehsana; never linked to Hero Rameshbhai Patel.

---

### Scenario S5: Identity Reference Linking
- **Records:** `HLT-0002` (Meena Patel) and `FOOD-0002` (Meenaben R Patel)
- **Condition:** Share synthetic identity reference token `SYN-ID-000002`.
- **Expected Outcome:** Linked immediately via `VERIFIED_ID` with strength `VERIFIED`.

---

### Scenario S6: Missing DOB Handling
- **Record:** `HLT-0006` (Jignesh Vaghela, DOB blank)
- **Expected Outcome:** Cannot auto-link to any existing profile; creates a new person flagged with data flag `["MISSING_DOB"]`.

---

### Scenario S7: Duplicate Ingestion Row
- **Records:** `HLT-0007` and `HLT-0007` (duplicate exact row in `health.csv` for Bharatbhai Joshi)
- **Expected Outcome:** Counted as duplicate in `duplicates_in_file` metric and skips re-creation.

---

### Scenario S8: Income Conflict Detection
- **Records:** `FOOD-0007` (Food income ₹3,50,000) vs `LAB-0002` (Labour income ₹2,00,000) for Dineshbhai Solanki (`GJ-RC-100002`)
- **Expected Outcome:** Triggers open `data_conflict` on `family_income`. Income-dependent schemes evaluate to `POTENTIALLY_ELIGIBLE` with missing info "Income verification required" until resolved by officer.

---

### Scenario S9: Unassigned Persons (No Ration Card)
- **Records:**
  - `LAB-0003` (Paresh Makwana, Surat)
  - `HLT-0008` (Amit Trivedi, Vadodara)
  - `HSG-0002` (Varshaben Rathod, Ahmedabad)
- **Expected Outcome:** Form individual Person profiles without a `family_id` (listed in Officer Unassigned Persons tab).

---

### Scenario S10: Missing Family Income
- **Records:** `FOOD-0009` (Manilal Baranda, `GJ-RC-100003`, Sabarkantha) with empty annual income.
- **Expected Outcome:** Scheme eligibility returns `POTENTIALLY_ELIGIBLE` with missing information `["Income verification required"]`.

---

### Scenario S11: Fully Enrolled Family with Renewal Due
- **Records:** `GJ-RC-100004` (Shah family, Vadodara: `HLT-0010`, `EDU-0003`, `HSG-0003`)
- **Expected Outcome:** All eligible schemes enrolled; one enrollment marked with renewal due within 30 days. Citizen re-apply is blocked.

---

### Scenario S12: Department Pre-enrolled Family Scheme
- **Records:** `HLT-0011` (Suresh Parmar, `GJ-RC-100005`, Surat) carries `health_scheme_enrolled=Y`.
- **Expected Outcome:** Family Health Cover shows "Already enrolled via Health Department", disabling duplicate application.
