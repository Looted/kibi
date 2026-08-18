---
title: Branch store migration preserves exact Git identity
status: active
text_ref: documentation/requirements/REQ-branch-store-recovery-v3.md
tags:
  - lane:ontology
  - branching
  - storage
  - migration
  - exact-identity
fact_kind: predicate
polarity: assert
predicate_namespace: kibi.storage
predicate_name: branch_store_identity_migration_policy
predicate_args:
  - same_exact_git_identity
  - literal_branch_store
  - hashed_branch_store
canonical_key: branch_store_identity_migration_policy(same_exact_git_identity,literal_branch_store,hashed_branch_store)
claim_key: CLAIM-3A65A655962C5ADA
claim_text: Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity
id: FACT-BRANCH-STORE-SAME-IDENTITY-MIGRATION
type: fact
---
Legacy migration may only convert a literal branch store to the hashed store for the same exact active Git branch identity.

