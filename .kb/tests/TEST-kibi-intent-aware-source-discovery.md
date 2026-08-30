---
id: TEST-kibi-intent-aware-source-discovery
title: Intent-aware source discovery verification
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/tests/TEST-kibi-intent-aware-source-discovery.md
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - search
  - intent
  - source
  - test
links:
  - type: validates
    target: SCEN-kibi-intent-aware-source-discovery
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-intent-aware-source-discovery
      target: default
  success_policy: all_required_first_attempt
---

The CLI and MCP search contracts accept natural-language intent, return stable ranked entities, include source-linked evidence and graph paths, and preserve explicit zero-result behavior. Unit and operation parity tests cover lexical fallback, source filters, relationship filters, and deterministic ordering.
