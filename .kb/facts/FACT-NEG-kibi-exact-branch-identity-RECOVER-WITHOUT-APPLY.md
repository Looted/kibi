---
title: A damaged branch store is rewritten without an explicit recovery
status: active
tags:
  - negative-path
fact_kind: predicate
predicate_name: branch_store_recovery_policy
predicate_namespace: kibi.storage
predicate_args:
  - damaged_exact_store
  - non_mutating
  - previewed_explicit_recovery
  - preserve_previous_bytes
polarity: deny
canonical_key: branch_store_recovery_policy(damaged_exact_store,non_mutating,previewed_explicit_recovery,preserve_previous_bytes)
origin:
  kind: agent
  recorded_at: '2026-11-10T06:00:00.000Z'
id: FACT-NEG-kibi-exact-branch-identity-RECOVER-WITHOUT-APPLY
type: fact
---
An exact branch store is damaged, and kibi branch recover changes its bytes before the person applies the previewed recovery.
