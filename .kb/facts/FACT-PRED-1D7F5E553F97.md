---
title: Git hook synchronization policy for branch-local KB
status: active
text_ref: documentation/requirements/REQ-git-hook-sync-v2.md
tags:
  - lane:ontology
  - predicate-suggestion
  - git
  - hooks
  - sync
fact_kind: predicate
predicate_name: git_hook_sync_policy
predicate_namespace: kibi.git
predicate_args:
  - post_checkout_and_post_merge
  - working_tree
  - branch_local_kb
canonical_key: git_hook_sync_policy(post_checkout_and_post_merge,working_tree,branch_local_kb)
polarity: assert
claim_key: CLAIM-38C827B85B91D638
claim_text: Those hooks must synchronize the branch-local KB with the working tree after checkout and merge
id: FACT-PRED-1D7F5E553F97
type: fact
---
