---
title: The consumer smoke checks all 18 required libraries with version, arithmetic and timestamp checks
status: active
text_ref: scripts/swipl-spike.py
tags:
  - strict-modeling
  - confidence:1.00
  - confidence-band:high
  - provenance:scripts-swipl-spike-py
  - lane:strict
  - fact:property_value
fact_kind: property_value
subject_key: kibi.prolog.build_pipeline_validation
property_key: consumer_smoke_required_libraries_checked
canonical_key: scripts-swipl-spike-py:kibi.prolog.build_pipeline_validation:consumer_smoke_required_libraries_checked:eq:18
operator: eq
value_type: int
value_int: 18
claim_key: CLAIM-58124B5D9E47F417
claim_text: The SWI-Prolog consumer smoke must check the pinned version, LibBF arithmetic, subsecond file timestamps, and all 18 required libraries
claim_span_start: 1511
claim_span_end: 1646
id: FACT-prolog-build-requests-full-library-and-arithmetic-and-mtime-smoke
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
