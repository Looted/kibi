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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-14139701b28035348d92e246
    test_id: TEST-kibi-logical-requirement-coverage
    scope: end_to_end
    outcome: passed
    code_snapshot: 1fcdc3b2c318886286faffa28fc34e8ae59ae46515e4d9f13da5489d1bc40d6e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:20:05.517Z'
    finished_at: '2026-10-28T17:21:32.442Z'
    artifact_digest: 84eb940300cc082e2ef3d63e8e4a2c3e9c96bb19f23b37df14ca05a5ea366372
    contract_hash: 169368fa251f7e0e38eda65faf205649c6758c3d20a4439939edb6474f848759
    binding_hash: 70ceb04cbd13beace742b45228e36d16cdcbd63d5ee3565174a94dd0b1d222a4
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies stable clause keys including trailing-punctuation normalization, compound semantic-advisor receipts, merged modeling manifests, paired and hash-consistent claim provenance, bijective manifest-to-ground-fact coverage, duplicate-term rejection, lossless repeated-relationship decoding, default rule activation, title-independent logical-debt diagnostics, exact predicate polarity contradictions, MCP contradiction rejection, MCP schema preservation of claim patterns, uniqueness, and conditional provenance, staged-overlay preservation of manifests, predicate fields, and verification metadata, final-state evidence normalization, and Skillopt logical-coverage scoring.

Executable coverage spans `packages/core/tests/kb.plt`, `packages/cli/tests/traceability/temp-kb.test.ts`, `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts`, `packages/mcp/tests/server/tools.test.ts`, `packages/mcp/tests/tools/model-requirement.test.ts`, `packages/mcp/tests/tools/suggest-predicates.test.ts`, `packages/mcp/tests/tools/upsert-contradictions.test.ts`, the packed MCP parity tests, and the Skillopt evaluator tests.
