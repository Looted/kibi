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
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
tags:
  - review:context-missing
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c380a74247a4c6f6af7fb5da
    test_id: TEST-rule-registry-single-source
    scope: unit
    outcome: passed
    code_snapshot: 1d5bc71e944be8ddccfdb37cf3622375ef36850933b4f87d153a603152368662
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T12:09:33.691Z'
    finished_at: '2026-11-05T12:12:51.062Z'
    artifact_digest: b39b74bff9760a7f282a5add8db18a92492ed15d5551c7473e7778ed0e83fcbf
    contract_hash: 626e00db815a61415250eb9b41dd48b9e1a3010bd181686b2dbf1e7702ddffe4
    binding_hash: 95b6769d033ded97dfa25cf57d1767188ce000ea2efd0b5ad74c1d8c6e72007f
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
