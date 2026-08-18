---
title: Branch store migration policy schema
status: active
tags:
  - ontology
  - branching
  - storage
  - migration
  - compatibility
fact_kind: predicate_schema
predicate_name: branch_store_migration_policy
predicate_namespace: kibi.storage
predicate_arity: 4
argument_names:
  - historical_attachment
  - legacy_source
  - exact_target
  - cross_branch_policy
argument_types:
  - attachment
  - store
  - store
  - decision
argument_descriptions:
  - Named historical compatibility attachment, or same_identity for the literal-to-hashed format bridge.
  - Explicit legacy literal source store identity.
  - Explicit exact hashed target store identity matching the active Git branch.
  - Whether non-historical cross-branch moves are accepted.
aliases:
  - historical Git master attached to legacy main store
  - same-identity literal to hashed migration
  - reject arbitrary cross-branch moves
examples:
  - branch_store_migration_policy(git_master_legacy_main_attachment,legacy_main_store,exact_master_store,reject_arbitrary_cross_branch_moves)
  - branch_store_migration_policy(same_identity,legacy_exact_ref_store,hashed_exact_ref_store,reject_arbitrary_cross_branch_moves)
id: FACT-SCHEMA-BRANCH-STORE-MIGRATION-POLICY
type: fact
---
