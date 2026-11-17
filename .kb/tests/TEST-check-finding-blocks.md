---
title: Finding blocks tag tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-check-finding-blocks
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-finding-blocks
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2804906bd40c71e8a9eaf162
    test_id: TEST-check-finding-blocks
    scope: end_to_end
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:50:17.539Z'
    finished_at: '2026-11-17T07:50:17.787Z'
    artifact_digest: 8baf152f51f17d241b30c684b83a6f309efb185e9f6e9c082209787519bf20e9
    contract_hash: 438c3eec9848723a9f614dc7bbc13ade5bd04d0a0a68aa4c7d05dc16a90e0d81
    binding_hash: 9e8a803b01e6deb9a986e6d1d6cde13f785a169ca424e796b1a9007c02c25177
    fingerprint: f1b750345afb0d3bba9755d48f70c494bec5e80752e32d921fd507cd7e7eb173
    fingerprint_components:
      contract: 438c3eec9848723a9f614dc7bbc13ade5bd04d0a0a68aa4c7d05dc16a90e0d81
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
      - symbol_id: SYM-test-check-finding-blocks
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that every finding of the full check carries blocks merge or none, every staged and changed finding carries blocks commit or none, a finding that is blocking or has severity error stops its level, and the envelope's diagnostics leave the tag out.