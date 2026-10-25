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
    receipt_id: PR-3fc0e865f9604aae6ad3d23d
    test_id: TEST-rule-registry-single-source
    scope: unit
    outcome: passed
    code_snapshot: c78d87453534f34be23060678a90114386641b97f24f1f909f008a3c1ad06ae5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:28:28.446Z'
    finished_at: '2026-10-25T12:28:29.617Z'
    artifact_digest: e8408e590ddcd8af1ae392209fe11e1be7fbc9427fe1c3bab5e54f22ce13200c
    contract_hash: 626e00db815a61415250eb9b41dd48b9e1a3010bd181686b2dbf1e7702ddffe4
    binding_hash: 1dd5779d4f8359d4ed0b182c0b257d52071bb27014d9953d05aa86cb854dc28e
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
