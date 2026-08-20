---
title: Git hook synchronization policy schema
status: active
tags:
  - ontology
  - git
  - hooks
  - sync
  - hooks synchronize branch KB
fact_kind: predicate_schema
predicate_name: git_hook_sync_policy
predicate_namespace: kibi.git
predicate_arity: 3
argument_names:
  - hooks
  - source_state
  - target_state
argument_types:
  - hook_set
  - state
  - state
argument_descriptions:
  - Concrete Git hook set.
  - State used as synchronization source.
  - State updated by the hooks.
aliases:
  - hooks synchronize the KB
  - sync after checkout and merge
examples:
  - git_hook_sync_policy(post_checkout_and_post_merge,working_tree,branch_local_kb)
id: FACT-SCHEMA-GIT-HOOK-SYNC-POLICY
type: fact
---
