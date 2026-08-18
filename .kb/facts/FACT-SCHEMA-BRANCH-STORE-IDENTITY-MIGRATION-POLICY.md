---
title: Same-identity branch store migration policy schema
status: active
tags:
  - ontology
  - branching
  - storage
  - migration
  - exact-identity
fact_kind: predicate_schema
predicate_name: branch_store_identity_migration_policy
predicate_namespace: kibi.storage
predicate_arity: 3
argument_names:
  - identity_relation
  - source_format
  - target_format
argument_types:
  - identity_relation
  - storage_format
  - storage_format
argument_descriptions:
  - Required relationship between source and target branch identities.
  - Legacy source storage format.
  - Exact target storage format.
examples:
  - branch_store_identity_migration_policy(same_exact_git_identity,literal_branch_store,hashed_branch_store)
id: FACT-SCHEMA-BRANCH-STORE-IDENTITY-MIGRATION-POLICY
type: fact
---
