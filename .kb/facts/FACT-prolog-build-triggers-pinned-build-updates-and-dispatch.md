---
title: The build workflow triggers on pin, build-script, patch, or workflow changes and manual dispatch
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
property_key: triggers_on_pins_scripts_patches_workflow_and_dispatch
canonical_key: scripts-swipl-spike-py:kibi.prolog.build_pipeline_validation:triggers_pinned_build_updates_and_dispatch:eq:true
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-F6911731ED97EF27
claim_text: The SWI-Prolog build workflow must trigger on pin, build-script, patch, or workflow changes and manual dispatch
claim_span_start: 243
claim_span_end: 354
id: FACT-prolog-build-triggers-pinned-build-updates-and-dispatch
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The workflow triggers on changes to the pins, build scripts, patches, the workflow file, the repack script and its test, plus manual dispatch.