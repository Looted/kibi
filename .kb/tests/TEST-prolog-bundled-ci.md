---
title: CI workflow contract, proof workflow contract, and cached-build population controls
status: active
tags:
  - prolog
  - bundle
  - ci
  - review:context-missing
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ci-workflow-contract
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-ci
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f009f157b4b7a9b1c2cc1fb6
    test_id: TEST-prolog-bundled-ci
    scope: end_to_end
    outcome: passed
    code_snapshot: 71ce190519b5d9649221438405c35aa02000cd08af7f9e9b406a0318e12d6107
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:37:25.621Z'
    finished_at: '2026-10-28T10:37:28.227Z'
    artifact_digest: 4e4ec59a7f9717f2f887888bda656a1da539c2b7fa060116e48b76861cbb6d02
    contract_hash: 2367af30118c15fbb90e61344777bfac636742cf30e80ccfc6daaa8b6f2ab522
    binding_hash: 4d163faa6d2df40f745205b198b0acad545b6eccdb1ad9c246cee42bb9d276e5
    fingerprint: f01ea5ffe1b7c0d6344908fe7c97ff86964d9fda87fe2e6113b40cd2fe59b544
    fingerprint_components:
      contract: 2367af30118c15fbb90e61344777bfac636742cf30e80ccfc6daaa8b6f2ab522
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
      - symbol_id: SYM-test-ci-workflow-contract
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
