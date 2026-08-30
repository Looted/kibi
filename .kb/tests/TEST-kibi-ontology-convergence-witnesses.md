---
id: TEST-kibi-ontology-convergence-witnesses
title: Packed ontology convergence and contradiction witness tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-ontology-convergence-witnesses.md
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - requirements
  - ontology
  - predicates
  - contradictions
  - witnesses
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-ontology-convergence-witnesses
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-ontology-convergence-witnesses
      target: default
  success_policy: all_required_first_attempt
type: test
---

Exercises project-local schema discovery, exact schema and polarity selection, binding-plan withholding, and source-bound contradiction evidence through a packed CLI consumer installation. Core PLUnit coverage separately proves strict, predicate, contradictory-rule, and unresolved-rule witness semantics.
