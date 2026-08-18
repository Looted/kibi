---
title: Exact branch identity transformation policy
status: active
text_ref: documentation/requirements/REQ-branch-store-recovery-v2.md
tags:
  - lane:ontology
  - branching
  - identity
  - normalization
  - rename
fact_kind: predicate
predicate_name: branch_identity_transform_policy
predicate_namespace: kibi.git
predicate_args:
  - branch_local_kb
  - master_to_main__default_branch_inference__git_branch_rename
  - forbidden
canonical_key: branch_identity_transform_policy(branch_local_kb,master_to_main__default_branch_inference__git_branch_rename,forbidden)
polarity: assert
claim_key: CLAIM-3A485C91255E982A
claim_text: It must not normalize master to main, infer a default branch for a new store, or rename a Git branch
id: FACT-PRED-D62E80F439F2
type: fact
---
