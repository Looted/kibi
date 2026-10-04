---
title: 'Predicate: not conditional_behavior(kibi_kb_merge_workflow,proof_baseline_check_fails,push_merge)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_kb_merge_workflow
  - proof_baseline_check_fails
  - push_merge
canonical_key: conditional_behavior(kibi_kb_merge_workflow,proof_baseline_check_fails,push_merge)
polarity: deny
claim_key: CLAIM-F05F6D6F1413047B
claim_text: When the proof baseline check fails, the Kibi KB merge workflow must not push the merge
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - ci
  - merge
id: FACT-PRED-ci-kb-merge-no-push-on-gate-failure
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
