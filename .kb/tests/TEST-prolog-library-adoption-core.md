---
id: TEST-prolog-library-adoption-core
title: Prolog library adoption core parity and validation tests
status: passing
created_at: 2026-06-02T00:00:00.000Z
updated_at: 2026-06-02T00:00:00.000Z
source: packages/core/tests/kb.plt
tags:
  - prolog
  - chr
  - sparql
  - aggregate
links:
  - type: validates
    target: SCEN-prolog-library-adoption
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-prolog-library-adoption-core
      target: default
  success_policy: all_required_first_attempt
type: test
---

Verification covers the `library(aggregate)` relationship-count characterization, CHR-derived coverage and symbol gap parity, and no-network Prolog SPARQL validation behavior.
