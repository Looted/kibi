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
    - symbol_id: SYM-e2e-predicate-suggestion-relevance
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-041c7aeee6d2211e5e47780d
    test_id: TEST-skillopt-predicate-first-requirements
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e092b6bf33d7fd29a52293aee3315f2f79eacd27f5ff919cbfef4bcfc58cab1b
    binding_hash: 124a7ea7fe923f8850cd28a211c50f92cc30b5395a0a0c5f59a7e41e99700722
    fingerprint: 33139d2d3b766b02cc220617d1c855d2dffbe74f55cdacb7d405fff19097cec0
    fingerprint_components:
      contract: e092b6bf33d7fd29a52293aee3315f2f79eacd27f5ff919cbfef4bcfc58cab1b
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
      - symbol_id: SYM-e2e-predicate-suggestion-relevance
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
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
