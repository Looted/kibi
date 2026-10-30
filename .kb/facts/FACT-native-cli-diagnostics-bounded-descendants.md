---
title: Descendant sampling takes at most 256 processes and 256 tasks per process
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
property_key: max_sampled_processes_or_tasks_per_process
operator: lte
value_type: int
value_int: 256
canonical_key: kibi.testing.native_cli_diagnostics:max_sampled_processes_or_tasks_per_process:lte:256
claim_key: CLAIM-F0A7ABEF357F32A5
claim_text: On Linux, native CLI diagnostics must observe descendants launched by background threads while sampling at most 256 processes and 256 tasks per process
id: FACT-native-cli-diagnostics-bounded-descendants
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
