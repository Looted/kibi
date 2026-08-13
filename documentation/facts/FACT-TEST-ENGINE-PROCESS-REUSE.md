---
id: FACT-TEST-ENGINE-PROCESS-REUSE
title: Ordinary integration tests reuse engine processes
status: active
created_at: 2026-08-12T00:00:00Z
updated_at: 2026-08-12T00:00:00Z
source: packages/cli/tests/prolog.test.ts
tags: [lane:ontology, testing, engine, reuse]
fact_kind: predicate
predicate_namespace: kibi.testing
predicate_name: logical_requirement_rule
predicate_args: [ordinary_integration_test, process_lifecycle, reuse_within_isolation_boundary]
canonical_key: logical_requirement_rule(ordinary_integration_test,process_lifecycle,reuse_within_isolation_boundary)
polarity: assert
claim_key: CLAIM-C17C22D2476F606C
claim_text: Ordinary integration tests MUST reuse long-lived engine or Prolog processes within an isolation boundary while lifecycle and compatibility tests MAY create dedicated processes
claim_span_start: 146
claim_span_end: 321
---

Ground representation of process reuse and its lifecycle-test exception.
