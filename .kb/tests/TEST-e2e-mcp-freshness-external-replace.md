---
title: MCP refreshes an externally replaced branch KB snapshot
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-freshness-external-replace
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-mcp-freshness-external-replace
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4dc113bcf76a6869aa55be6d
    test_id: TEST-e2e-mcp-freshness-external-replace
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 324a80b163afbcc62bb1a4c8c38e4c6825f0b7b03574b8c87a3d8ac00cc35a0e
    binding_hash: e13ccdc9b0c2a97315775320151dc116ef0356edeb770f9d1324308f85d48367
    fingerprint: d7d19108ce5e2ace3c65e0feccb41b17ddaab5c903f9340f45477b6b0576596a
    fingerprint_components:
      contract: 324a80b163afbcc62bb1a4c8c38e4c6825f0b7b03574b8c87a3d8ac00cc35a0e
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
      - symbol_id: SYM-e2e-test-mcp-freshness-external-replace
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

Packed end-to-end regression for mcp refreshes an externally replaced branch kb snapshot.
