---
title: kb_search meaning ranking tests
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
    receipt_id: PR-eacc11e3635c64433bc2ae5d
    test_id: TEST-kibi-search-hints-host
    scope: end_to_end
    outcome: passed
    code_snapshot: 4b66676736e4ffd3d568ebd40c071d55c0a0c605ee2bb57b0941bd7a509e70d6
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T19:50:34.314Z'
    finished_at: '2026-11-25T19:50:37.032Z'
    artifact_digest: 6fcfa78a1ac1d9dc7a685041f7165d8f263ca3d9f3ce5c9191ed874044db6566
    contract_hash: 4f0dd1922bf5b05bf8986aaf0c245d881c31a7168a487695adb2928c9dd93487
    binding_hash: 9ff51c6066f805acea7b064e5a9ec124f2065c7e085d92b900ac2af931033d5a
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
CLI tests for the meaning ranking of kb_search: replace and shadow composition, a throwing, invalid or late provider giving no scores and a diagnostic, the operation allowlist, the provider's first and warm time budgets and its per-workspace cache directory (packages/cli/tests/search-hints.test.ts), and decision search fusing the provider's scores, crediting each decision with its linked scenarios, tests and assumed facts and listing the closest decisions that are not cards (packages/cli/tests/decision-search.test.ts), with kb_search answers with a provider, without one and with one that cannot load.