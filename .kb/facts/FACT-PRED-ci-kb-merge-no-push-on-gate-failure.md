---
title: 'Predicate: not conditional_behavior(kibi_kb_merge_workflow,prepush_proof_check_fails,push_merge)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_kb_merge_workflow
  - prepush_proof_check_fails
  - push_merge
canonical_key: conditional_behavior(kibi_kb_merge_workflow,prepush_proof_check_fails,push_merge)
polarity: deny
claim_key: CLAIM-A7F3E202CDAC826D
claim_text: When the pre-push proof check fails, the Kibi KB merge workflow must not push the merge
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - ci
  - merge
id: FACT-PRED-ci-kb-merge-no-push-on-gate-failure
type: fact
---
