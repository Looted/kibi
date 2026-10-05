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
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7872a0e16a518ae07625f24c
    test_id: TEST-skillopt-predicate-first-requirements
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 88459ea5226ddb300e8ead2458177c17b7fdf2fce5fcf5ef35fcc38003f9ab62
    binding_hash: 096ff1ce1844e298f4337105cee56de3eb60973de614bc36345a3dc41b307bec
    fingerprint: d5b532c7c6af26475615dadc206c38e4dda2ddac85668f1b2d036a5376223413
    fingerprint_components:
      contract: 88459ea5226ddb300e8ead2458177c17b7fdf2fce5fcf5ef35fcc38003f9ab62
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-test-skillopt-predicate-first-requirements
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies the exact typed requirement, scenario, test, and executable-symbol chain and rejects reversed, generic, dangling, or wrong executable-symbol relationships with structured diagnostics. The test surface also distinguishes required predicate, strict subject/property, and review-observation lanes so missing modeling outcomes fail independently.

Public-fixture regressions verify that project-local schemas expose stable signatures and that the corpus no longer presents relationship types as built-in predicates. Optimizer-output regressions require concrete schema/name/ordered-argument/canonical-key/polarity guidance and reject repository-policy contamination before candidate evaluation.

The compound training case verifies mixed predicate and strict-property lanes, claim provenance, manifest cardinality, and manifest-to-ground-fact correspondence. A missing clause, missing `claim_text`, stale manifest, or one-edge shortcut produces typed behavioral feedback rather than infrastructure failure.

Manual Kibi QA supplements the file-level test by inspecting the persisted graph and fact payloads after sequential validated writes. It verifies predicate suitability, scalar strict pairing, ontology-gap review handling, no prose erasure, targeted and full checks, and fresh status rather than relying on optimistic test output.

Evaluator-authority regressions also feed authentic MCP `structuredContent.entities` responses through the final-state decoder. They verify incoming predicate relationships and observation review tags are normalized into the private snapshot, while a wrong modeling lane produces typed behavioral predicate failures instead of `evidence-conflict`.

Default-evidence regressions also cover an invalid predicate-tool attempt followed by a corrected successful call. Both attempts remain in ordered broker evidence, while the diagnostic receipt is required to contain only the successful call, proving that ordinary model correction stays in the behavioral scoring lane.

Held-out predicate-gate regressions require all 36 unique reserved cells and every SkillOpt replicate to hard-pass. They separately prove that a weak baseline or one-shot predicate result remains comparator evidence instead of vetoing an otherwise successful candidate.
