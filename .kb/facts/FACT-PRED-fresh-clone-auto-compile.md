---
title: Kibi compiles a never-compiled branch store on first use
status: active
tags:
  - lane:ontology
  - predicate:git
  - predicate:hooks
fact_kind: predicate
predicate_name: fresh_clone_setup_policy
predicate_namespace: kibi.setup
predicate_args:
  - kibi_operations
  - branch_store_never_compiled_and_auto_sync_on
  - compile_store_without_tracked_writes
polarity: assert
claim_key: CLAIM-9257D259BEE7DE86
claim_text: Kibi must compile a never-compiled branch store on first use without writing any file Git tracks, unless auto-sync is turned off
text_ref: .kb/requirements/REQ-kibi-first-use-auto-compile.md
origin:
  kind: agent
  recorded_at: '2026-11-03T15:26:20.497Z'
canonical_key: fresh_clone_setup_policy(kibi_operations,branch_store_never_compiled_and_auto_sync_on,compile_store_without_tracked_writes)
id: FACT-PRED-fresh-clone-auto-compile
type: fact
---
Kibi compiles a never-compiled branch store on first use. This predicate grounds the claim of REQ-kibi-first-use-auto-compile quoted in claim_text, so the requirement's semantic inventory counts it as modeled.