---
title: 'Predicate: conditional_behavior(kibi_kb_merge_workflow,building_merge_driver,use_base_branch_source)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_kb_merge_workflow
  - building_merge_driver
  - use_base_branch_source
canonical_key: conditional_behavior(kibi_kb_merge_workflow,building_merge_driver,use_base_branch_source)
polarity: assert
claim_key: CLAIM-F23EBD496387C5E3
claim_text: The Kibi KB merge workflow must build the merge driver from the base branch
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - ci
  - merge
id: FACT-PRED-ci-kb-merge-driver-from-base
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
