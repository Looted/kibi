---
title: Historical branch store migration boundary
status: superseded
text_ref: documentation/requirements/REQ-branch-store-recovery-v2.md
tags:
  - lane:ontology
  - branching
  - storage
  - migration
  - compatibility
fact_kind: predicate
predicate_name: branch_store_migration_policy
predicate_namespace: kibi.storage
predicate_args:
  - single_compatibility_workflow
  - master_store
  - legacy_main_store
  - reject_arbitrary_moves
canonical_key: branch_store_migration_policy(single_compatibility_workflow,master_store,legacy_main_store,reject_arbitrary_moves)
polarity: assert
claim_key: CLAIM-449AE98BAC3BD69C
claim_text: The historical master to legacy main store migration is a single compatibility workflow and must reject arbitrary cross-branch moves
id: FACT-PRED-4E2CF2C5E87D
type: fact
---
