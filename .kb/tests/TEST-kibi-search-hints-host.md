---
title: kb_search search hints host tests
status: passing
tags:
  - search
  - plugins
priority: should
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-search-hints-host
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-29T19:18:51.778Z'
id: TEST-kibi-search-hints-host
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cfc1d195d62ff97f5331af30
    test_id: TEST-kibi-search-hints-host
    scope: end_to_end
    outcome: passed
    code_snapshot: 86aa79d815f6e72a7264e4735e8c18223199357bff9ffad9c4ac72c57d956997
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-24T11:40:37.375Z'
    finished_at: '2026-11-24T11:40:40.710Z'
    artifact_digest: 9f2c778390a0442b3e7e4596b0f6f86c08ee8e4e1cda017db5cc8649081719e7
    contract_hash: 4f0dd1922bf5b05bf8986aaf0c245d881c31a7168a487695adb2928c9dd93487
    binding_hash: 85c73cfb5ada7729b90c8f27e9a2879eea4aafb30ccbe5900805c94c9cb2dd8c
    fingerprint: 2af39c1ddc2e600fac4cd39effc728dca8240393b637fcfd3d696653defcc141
    fingerprint_components:
      contract: 4f0dd1922bf5b05bf8986aaf0c245d881c31a7168a487695adb2928c9dd93487
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
      - symbol_id: SYM-test-kibi-search-hints-host
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
CLI tests for the search hints host: the trigger matrix, the current-entity corpus and its query-independent text, replace and shadow composition, failure, invalid result and timeout handling, the operation allowlist, lifting hits to linked requirements, and kb_search answers with hints on, off and with a provider that cannot load.
