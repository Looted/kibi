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
    receipt_id: PR-c9cfb3388c39e51085781926
    test_id: TEST-rule-registry-single-source
    scope: unit
    outcome: passed
    code_snapshot: 77a05ac3f136388d07560216e6f9644997c4b9918c6920a54149f03a47779bca
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T05:33:42.441Z'
    finished_at: '2026-11-10T05:36:08.645Z'
    artifact_digest: dc8736db249dfdd88751ad8485abe81283e5b9591ca84f894b18a7ce3504ead7
    contract_hash: 626e00db815a61415250eb9b41dd48b9e1a3010bd181686b2dbf1e7702ddffe4
    binding_hash: 67d43af7532bd98dced4c958b281046aadd5b02e528b3400399b404b1bf5b748
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
