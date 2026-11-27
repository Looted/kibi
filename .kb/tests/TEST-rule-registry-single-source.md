---
title: Check-rule registry stays single-sourced across TS, schema enum, and Prolog
status: passing
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-rule-registry-single-source
      target: default
  success_policy: all_required_first_attempt
id: TEST-rule-registry-single-source
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4cb2f518189eb20d1fa97b88
    test_id: TEST-rule-registry-single-source
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 626e00db815a61415250eb9b41dd48b9e1a3010bd181686b2dbf1e7702ddffe4
    binding_hash: 00a6c13ee7cbce12aea8ed6e028dad6b4a5519b26c6dea39f71c8db51d8788fc
    fingerprint: 83a28fb60d59d817d408705dd4aac1a74197283dd29ce3edf809beed51b697a3
    fingerprint_components:
      contract: 626e00db815a61415250eb9b41dd48b9e1a3010bd181686b2dbf1e7702ddffe4
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
      - symbol_id: SYM-unit-test-rule-registry-single-source
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

## Context
The TypeScript rule registry, the `kb_check` input enum and Prolog dispatch were kept in sync by hand. They're now generated from one JSON file, and this test fails CI if any of them drifts. Source: commit "generate the check-rule registry from a single JSON source".
