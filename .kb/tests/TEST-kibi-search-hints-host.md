---
title: kb_search search hints host tests
status: active
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
    receipt_id: PR-f9882b1c7ba2cefdaa71e0bc
    test_id: TEST-kibi-search-hints-host
    scope: end_to_end
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:47:14.486Z'
    finished_at: '2026-10-30T19:47:17.814Z'
    artifact_digest: 173470dc0f5ebc45abf1e7d9025573fbc0a5602378f22a104df3d6c0c5b99ad2
    contract_hash: 4f0dd1922bf5b05bf8986aaf0c245d881c31a7168a487695adb2928c9dd93487
    binding_hash: e560a4566b8ef40e8f6a2b2ac83605ba8ea3e5e8847c2d70108c09bb557b4bb4
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
