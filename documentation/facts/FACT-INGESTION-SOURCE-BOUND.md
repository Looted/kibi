---
id: FACT-INGESTION-SOURCE-BOUND
title: Proposition ledgers bind to exact source bytes
type: fact
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/facts/FACT-INGESTION-SOURCE-BOUND.md
fact_kind: predicate
predicate_name: source_bound_semantic_inventory
predicate_args: [source_field, sha256, utf8_span]
canonical_key: source_bound_semantic_inventory(source_field,sha256,utf8_span)
polarity: assert
claim_key: CLAIM-8F21AE06ED7D0517
claim_text: Ledger entries must bind to the exact semantic source field, SHA-256 hash, and UTF-8 span
claim_span_start: 74
claim_span_end: 163
---

Ground predicate for source field, digest, and byte-span integrity.
