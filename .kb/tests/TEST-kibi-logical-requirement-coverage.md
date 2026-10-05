---
id: TEST-kibi-logical-requirement-coverage
title: Clause-complete logical requirement modeling tests
status: passing
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: packages/core/tests/kb.plt
tags:
  - requirements
  - prolog
  - semantic-advisor
  - skillopt
  - unit
  - integration
verification_scope: end_to_end
links:
  - type: validates
    target: SCEN-kibi-logical-requirement-coverage
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-logical-requirement-coverage
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9e8d8aca2789422cd5a642ee
    test_id: TEST-kibi-logical-requirement-coverage
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 169368fa251f7e0e38eda65faf205649c6758c3d20a4439939edb6474f848759
    binding_hash: 22451e51d2404e369c821eda935c700d6a0d58012243c5e2e786c3ea713d7540
    fingerprint: 39433cadb755c70041e3e080507df0a234fe35369581e29b1f82603195b3ca81
    fingerprint_components:
      contract: 169368fa251f7e0e38eda65faf205649c6758c3d20a4439939edb6474f848759
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
      - symbol_id: SYM-e2e-test-kibi-logical-requirement-coverage
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
Verifies stable clause keys including trailing-punctuation normalization, compound semantic-advisor receipts, merged modeling manifests, paired and hash-consistent claim provenance, bijective manifest-to-ground-fact coverage, duplicate-term rejection, lossless repeated-relationship decoding, default rule activation, title-independent logical-debt diagnostics, exact predicate polarity contradictions, MCP contradiction rejection, MCP schema preservation of claim patterns, uniqueness, and conditional provenance, staged-overlay preservation of manifests, predicate fields, and verification metadata, final-state evidence normalization, and Skillopt logical-coverage scoring.

Executable coverage spans `packages/core/tests/kb.plt`, `packages/cli/tests/traceability/temp-kb.test.ts`, `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts`, `packages/mcp/tests/server/tools.test.ts`, `packages/mcp/tests/tools/model-requirement.test.ts`, `packages/mcp/tests/tools/suggest-predicates.test.ts`, `packages/mcp/tests/tools/upsert-contradictions.test.ts`, the packed MCP parity tests, and the Skillopt evaluator tests.
