---
id: TEST-skillopt-predicate-first-requirements
title: Predicate-first requirement graph contract tests
status: passing
created_at: 2026-07-26T00:00:00Z
updated_at: 2026-07-26T00:00:00Z
source: packages/cli/tests/traceability/predicate-first.test.ts
tags: [skillopt, agents, requirements, predicates, traceability, integration]
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: REQ-skillopt-predicate-first-requirements
---

Verifies the exact typed requirement, scenario, test, and executable-symbol chain and rejects reversed, generic, dangling, or wrong executable-symbol relationships with structured diagnostics. The test surface also distinguishes required predicate, strict subject/property, and review-observation lanes so missing modeling outcomes fail independently.

Manual Kibi QA supplements the file-level test by inspecting the persisted graph and fact payloads after sequential validated writes. It verifies predicate suitability, scalar strict pairing, ontology-gap review handling, no prose erasure, targeted and full checks, and fresh status rather than relying on optimistic test output.
