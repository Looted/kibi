---
title: Fresh snapshot-bound proof receipt tests
status: passing
tags:
  - requirements
  - proof
  - verification
  - receipts
  - prolog
  - cli
  - mcp
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
id: TEST-kibi-fresh-verification-receipts
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-fresh-verification-receipts
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-14d19506cb0c13cc1002e50c
    test_id: TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: d699a078fe8d2323d221f435a979d519f5acca43cfee14f7307e23c39a35f0fa
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T21:01:15.332Z'
    finished_at: '2026-11-16T21:01:34.441Z'
    artifact_digest: 3ef1b1564e3821c2d1f507334af153c4831866821439fdb98ef86c918ef3be6e
    contract_hash: ed7b763c96c8f85af5b97457206715b719837d03489a7236cd5e2aa2e449bcd8
    binding_hash: c1e0e4cf955b435704a1cc5e04476c24c9e14b52ecb073f77488b0451627e6df
    fingerprint: cb0be4beb70a47d0226524bfb901643f1ae90d813d706ef3a615b4b9fb78ff16
    fingerprint_components:
      contract: ed7b763c96c8f85af5b97457206715b719837d03489a7236cd5e2aa2e449bcd8
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
      - symbol_id: SYM-test-packed-fresh-verification-receipts
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
Verifies receipt schema and history validation, append-only mutation and sync behavior, deterministic workspace snapshots, Prolog proof-state classification, durable-status non-authority, and CLI/MCP reporting parity.
