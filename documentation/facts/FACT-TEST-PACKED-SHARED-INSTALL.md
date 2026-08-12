---
id: FACT-TEST-PACKED-SHARED-INSTALL
title: Packed workers share an immutable installation
status: active
created_at: 2026-08-12T00:00:00Z
updated_at: 2026-08-12T00:00:00Z
source: documentation/tests/e2e/packed/helpers.ts
tags: [lane:ontology, testing, packed, concurrency]
fact_kind: predicate
predicate_namespace: kibi.testing
predicate_name: logical_requirement_rule
predicate_args: [packed_e2e_worker, installation_and_concurrency, shared_immutable_prefix_bounded_isolated]
canonical_key: logical_requirement_rule(packed_e2e_worker,installation_and_concurrency,shared_immutable_prefix_bounded_isolated)
polarity: assert
claim_key: CLAIM-A1ABDF2E6AF7629A
claim_text: Packed end-to-end workers MUST share an immutable installed package prefix and execute with bounded concurrency while retaining per-workspace engine isolation
claim_span_start: 323
claim_span_end: 481
---

Ground representation of packed installation reuse with workspace isolation.
