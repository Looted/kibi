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
    receipt_id: PR-bd833f0c7132746d8e11a184
    test_id: TEST-rule-registry-single-source
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
