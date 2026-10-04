---
title: Publishes Checksum And Pinned Manifest = true
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
property_key: publishes_checksum_and_pinned_manifest
canonical_key: scripts-swipl-spike-py:kibi.prolog.build_pipeline_validation:publishes_checksum_and_pinned_manifest:eq:true
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-E03C7DA3C74038FA
claim_text: The SWI-Prolog artifact writer must publish a SHA-256 sidecar and a build manifest containing the target, exact source and dependency and patch pins, source commit, workflow run ID, binary checksum, and relative SWI home
claim_span_start: 356
claim_span_end: 576
id: FACT-prolog-build-publishes-checksum-and-pinned-manifest
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
