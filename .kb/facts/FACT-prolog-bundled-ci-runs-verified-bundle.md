---
title: CI Jobs Run Verified Bundle = true
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
text_ref: .github/actions/use-bundled-swipl/action.yml
fact_kind: property_value
subject_key: kibi.prolog.bundled_ci
property_key: ci_jobs_run_verified_bundle
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-68A623E1A0EC156C
claim_text: Kibi's own CI Prolog jobs must run the bundled SWI-Prolog archive built by the release pipeline after re-verifying its checksum, pins, and binary hash
claim_span_start: 0
claim_span_end: 150
id: FACT-prolog-bundled-ci-runs-verified-bundle
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
