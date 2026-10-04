---
id: TEST-mcp-kb-freshness
title: MCP same-branch KB freshness tests
status: passing
created_at: 2026-07-20T00:00:00.000Z
updated_at: 2026-07-20T00:00:00.000Z
source: packages/mcp/tests/server/kb-freshness.test.ts
tags:
  - mcp
  - branch
  - freshness
  - integration
links:
  - type: validates
    target: SCEN-mcp-kb-freshness
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-kb-freshness
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4ba24ea75305dee3cdccf023
    test_id: TEST-mcp-kb-freshness
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: e7c4bb73116c831d679581255f2a0676bd8d24ee2b909b00ef6ae91592fcaa5c
    binding_hash: 18d89810ee9e0a1b8e62fa56243eaccfc5aaf04ebab2961464a073f49798ed71
    fingerprint: 103254618500a69c12e629668bfc81f4dc0030610a854f04dbbb0302fde0d5dd
    fingerprint_components:
      contract: e7c4bb73116c831d679581255f2a0676bd8d24ee2b909b00ef6ae91592fcaa5c
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
      - symbol_id: SYM-e2e-test-mcp-kb-freshness
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
Verifies that the MCP session refreshes an externally replaced same-branch KB attachment and fails closed when refresh reconciliation cannot complete.
