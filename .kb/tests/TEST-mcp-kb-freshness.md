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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7c1e132e4db706af73cbb5d7
    test_id: TEST-mcp-kb-freshness
    scope: end_to_end
    outcome: passed
    code_snapshot: 75ca354cb2640db989f3719d6a1a24a9adb15151e270adbc1c6477876e56a614
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-22T18:01:33.649Z'
    finished_at: '2026-11-22T18:01:38.410Z'
    artifact_digest: ae17bb3ded8db11429eee2a666d22d02535ad48b06cfadb8e70b58bb94ced57c
    contract_hash: e7c4bb73116c831d679581255f2a0676bd8d24ee2b909b00ef6ae91592fcaa5c
    binding_hash: a841b300b398861b3f87a4d4a3f78d84ea6a9193f37ae2dceff031069708d8c6
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies that the MCP session refreshes an externally replaced same-branch KB attachment and fails closed when refresh reconciliation cannot complete.
