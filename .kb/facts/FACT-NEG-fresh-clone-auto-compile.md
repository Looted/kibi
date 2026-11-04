---
title: A store-backed operation leaves the never-compiled branch store empty with auto-sync on
status: active
fact_kind: predicate
predicate_name: fresh_clone_setup_policy
predicate_namespace: kibi.setup
predicate_args:
  - kibi_operations
  - branch_store_never_compiled_and_auto_sync_on
  - compile_store_without_tracked_writes
polarity: deny
canonical_key: fresh_clone_setup_policy(kibi_operations,branch_store_never_compiled_and_auto_sync_on,compile_store_without_tracked_writes)
origin:
  kind: agent
  recorded_at: '2026-11-03T16:09:04.644Z'
id: FACT-NEG-fresh-clone-auto-compile
type: fact
---
A store-backed operation leaves the never-compiled branch store empty with auto-sync on. The failure-side scenario of REQ-kibi-fresh-clone-setup assumes this state and expects Kibi to report it instead of carrying on silently.