---
id: FACT-ATOMIC-UPSERT-SNAPSHOT
title: Concurrent upserts require a current attached snapshot
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/facts/FACT-ATOMIC-UPsert-SNAPSHOT.md
tags: [lane:ontology, persistence, concurrency, snapshots]
fact_kind: predicate
predicate_namespace: kibi.persistence
predicate_name: upsert_concurrency_requires_fresh_snapshot
predicate_args: [current_runtimes_serialize, stale_snapshot_fails_before_mutation]
canonical_key: upsert_concurrency_requires_fresh_snapshot(current_runtimes_serialize,stale_snapshot_fails_before_mutation)
polarity: assert
claim_key: CLAIM-B03495A1D1AC6DBE
claim_text: Concurrent current runtimes serialize through the branch lock, while a stale attached snapshot fails before mutation
claim_span_start: 666
claim_span_end: 782
---

Ground representation of branch-lock serialization and stale-snapshot rejection.
