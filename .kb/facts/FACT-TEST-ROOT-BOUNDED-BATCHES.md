---
id: FACT-TEST-ROOT-BOUNDED-BATCHES
title: Root test batches are bounded and deterministic
status: active
created_at: 2026-08-12T00:00:00Z
updated_at: 2026-08-12T00:00:00Z
source: test/root.test.ts
tags: [lane:ontology, testing, root-suite, concurrency]
fact_kind: predicate
predicate_namespace: kibi.testing
predicate_name: logical_requirement_rule
predicate_args: [curated_root_suite, batch_execution, bounded_deterministic_awaited_cleanup]
canonical_key: logical_requirement_rule(curated_root_suite,batch_execution,bounded_deterministic_awaited_cleanup)
polarity: assert
claim_key: CLAIM-06A81A38F99959C8
claim_text: The curated root suite MUST run package batches with bounded concurrency preserve deterministic summaries await all workers and clean test-owned engines after each batch
claim_span_start: 483
claim_span_end: 652
---

Ground representation of bounded root batching and cleanup behavior.
