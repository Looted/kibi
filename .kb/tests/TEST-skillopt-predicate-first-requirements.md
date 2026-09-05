---
id: TEST-skillopt-predicate-first-requirements
title: Predicate-first requirement graph contract tests
status: passing
created_at: 2026-07-26T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: packages/cli/tests/traceability/predicate-first.test.ts
tags:
  - skillopt
  - agents
  - requirements
  - predicates
  - traceability
  - integration
verification_scope: end_to_end
verification_perspective: internal
links:
  - type: validates
    target: REQ-skillopt-predicate-first-requirements
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-skillopt-predicate-first-requirements
      target: default
  success_policy: all_required_first_attempt
type: test
---

Verifies the exact typed requirement, scenario, test, and executable-symbol chain and rejects reversed, generic, dangling, or wrong executable-symbol relationships with structured diagnostics. The test surface also distinguishes required predicate, strict subject/property, and review-observation lanes so missing modeling outcomes fail independently.

Public-fixture regressions verify that project-local schemas expose stable signatures and that the corpus no longer presents relationship types as built-in predicates. Optimizer-output regressions require concrete schema/name/ordered-argument/canonical-key/polarity guidance and reject repository-policy contamination before candidate evaluation.

The compound training case verifies mixed predicate and strict-property lanes, claim provenance, manifest cardinality, and manifest-to-ground-fact correspondence. A missing clause, missing `claim_text`, stale manifest, or one-edge shortcut produces typed behavioral feedback rather than infrastructure failure.

Manual Kibi QA supplements the file-level test by inspecting the persisted graph and fact payloads after sequential validated writes. It verifies predicate suitability, scalar strict pairing, ontology-gap review handling, no prose erasure, targeted and full checks, and fresh status rather than relying on optimistic test output.

Evaluator-authority regressions also feed authentic MCP `structuredContent.entities` responses through the final-state decoder. They verify incoming predicate relationships and observation review tags are normalized into the private snapshot, while a wrong modeling lane produces typed behavioral predicate failures instead of `evidence-conflict`.

Default-evidence regressions also cover an invalid predicate-tool attempt followed by a corrected successful call. Both attempts remain in ordered broker evidence, while the diagnostic receipt is required to contain only the successful call, proving that ordinary model correction stays in the behavioral scoring lane.

Held-out predicate-gate regressions require all 36 unique reserved cells and every SkillOpt replicate to hard-pass. They separately prove that a weak baseline or one-shot predicate result remains comparator evidence instead of vetoing an otherwise successful candidate.
