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
    receipt_id: PR-7d96326d4b6324f52532ef23
    test_id: TEST-kibi-search-hints-host
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 4f0dd1922bf5b05bf8986aaf0c245d881c31a7168a487695adb2928c9dd93487
    binding_hash: dcb25256f754e6ea5ff08fe1ea3c1c7192cfb19380885d37315a6c97f7da399d
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
