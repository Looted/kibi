---
title: Bounded Descendant Sampling = true
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
subject_key: kibi.testing.native_cli_diagnostics
property_key: bounded_descendant_sampling
canonical_key: scripts-swipl-spike-py:kibi.testing.native_cli_diagnostics:bounded_descendant_sampling:eq:true
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-F0A7ABEF357F32A5
claim_text: On Linux, native CLI diagnostics must observe descendants launched by background threads while sampling at most 256 processes and 256 tasks per process
id: FACT-native-cli-diagnostics-bounded-descendants
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
