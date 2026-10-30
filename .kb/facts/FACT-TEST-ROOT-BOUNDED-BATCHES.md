---
id: FACT-TEST-ROOT-BOUNDED-BATCHES
title: Root test batches are bounded and deterministic
status: active
created_at: 2026-08-12T00:00:00.000Z
updated_at: 2026-08-12T00:00:00.000Z
source: test/root.test.ts
tags:
  - lane:ontology
  - testing
  - root-suite
  - concurrency
fact_kind: property_value
subject_key: kibi.testing.harness
property_key: root_suite_batches_unbounded_unawaited_or_uncleaned
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-06A81A38F99959C8
claim_text: The curated root suite MUST run package batches with bounded concurrency preserve deterministic summaries await all workers and clean test-owned engines after each batch
claim_span_start: 483
claim_span_end: 652
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground representation of bounded root batching and cleanup behavior.
