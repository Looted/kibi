---
title: Branch store recovery policy schema
status: active
tags:
  - ontology
  - branching
  - storage
  - recovery
  - preservation
fact_kind: predicate_schema
predicate_name: branch_store_recovery_policy
predicate_namespace: kibi.storage
predicate_arity: 4
argument_names:
  - store_state
  - diagnosis_mode
  - rebuild_authorization
  - byte_preservation
argument_types:
  - state
  - mode
  - authorization
  - preservation
argument_descriptions:
  - Store condition that activates recovery.
  - Whether diagnosis mutates the store.
  - Required authorization before rebuild.
  - Required preservation of prior bytes.
aliases:
  - diagnose damaged store without mutation
  - previewed explicit recovery preserves bytes
examples:
  - branch_store_recovery_policy(damaged_exact_store,non_mutating,previewed_explicit_recovery,preserve_previous_bytes)
id: FACT-SCHEMA-BRANCH-STORE-RECOVERY-POLICY
type: fact
---
