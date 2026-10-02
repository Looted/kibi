---
title: 'Predicate: conditional_behavior(kibi_kb_merge_workflow,lockfile_mismatches_merged_manifests,refresh_lockfile_in_merge_commit)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_kb_merge_workflow
  - lockfile_mismatches_merged_manifests
  - refresh_lockfile_in_merge_commit
canonical_key: conditional_behavior(kibi_kb_merge_workflow,lockfile_mismatches_merged_manifests,refresh_lockfile_in_merge_commit)
polarity: assert
claim_key: CLAIM-15708CC40556996E
claim_text: The Kibi KB merge workflow must refresh a lockfile that does not match the merged package manifests in the merge commit
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - ci
  - merge
id: FACT-PRED-ci-kb-merge-lockfile-refresh
type: fact
---
