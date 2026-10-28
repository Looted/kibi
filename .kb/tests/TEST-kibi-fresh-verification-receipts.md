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
    receipt_id: PR-69436c7d26ba4864a13b7624
    test_id: TEST-kibi-fresh-verification-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: ebc106e5d7924a9ee2a860dfc5601c8f8311531c6d560d6647b330d4db83fd82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:08:16.550Z'
    finished_at: '2026-10-28T11:09:27.935Z'
    artifact_digest: 9e59521e0502e21d1c5a347b0738cafe29f6e522fbd567889e5bde601c38f9fe
    contract_hash: ed7b763c96c8f85af5b97457206715b719837d03489a7236cd5e2aa2e449bcd8
    binding_hash: d04b036d507d6629257c3a3721efe0962d5d40be66a6cf4ce12d0e13c6d3e8d9
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
