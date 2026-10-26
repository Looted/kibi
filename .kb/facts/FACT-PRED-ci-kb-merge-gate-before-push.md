---
title: 'Predicate: conditional_behavior(kibi_kb_merge_workflow,before_pushing_merge,run_proof_gate)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_kb_merge_workflow
  - before_pushing_merge
  - run_proof_gate
canonical_key: conditional_behavior(kibi_kb_merge_workflow,before_pushing_merge,run_proof_gate)
polarity: assert
claim_key: CLAIM-8948B0F74FEC41BA
claim_text: The Kibi KB merge workflow must run the proof gate before pushing a merge
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - ci
  - merge
id: FACT-PRED-ci-kb-merge-gate-before-push
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
