---
title: Packed CLI model-requirement returns strict and observation write sets
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-strict-modeling-surface
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-strict-modeling-surface
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8dcfc4420574ed716e7d6f35
    test_id: TEST-e2e-strict-modeling-surface
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 62bb341ec3ac05030910a1c9ef20b04db9a017531d44d6c618742400599fcf73
    binding_hash: 7e983209634d14767f3031666ce60b3e75444a7a2766181c938e37ad8b0de174
    fingerprint: 740ddc7856ffc78f07747b107d7ac80da29ce52d84cd834fbfb45caa6f13652c
    fingerprint_components:
      contract: 62bb341ec3ac05030910a1c9ef20b04db9a017531d44d6c618742400599fcf73
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
      - symbol_id: SYM-e2e-test-cli-strict-modeling-surface
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Packed end-to-end regression for packed cli model-requirement returns strict and observation write sets.
