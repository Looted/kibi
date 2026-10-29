---
title: A test runner variable that silences telemetry shall be NODE_ENV=test, JEST_WORKER_ID, VITEST, VITEST_WORKER_ID or NODE_TEST_CONTEXT, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-telemetry-test-env-keys
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-test-env-keys
  proves:
    - CLAIM-25B6330588FD2199
origin:
  kind: agent
  recorded_at: '2026-10-29T16:28:32.548Z'
id: TEST-proof-telemetry-test-env-keys
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-09e8fe4bff16c92685ff12f9
    test_id: TEST-proof-telemetry-test-env-keys
    scope: unit
    outcome: passed
    code_snapshot: ec09c5c8360bc62374cc96794ed302e6b74770738cb7481a3617e21f01ce4a15
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:29:38.827Z'
    finished_at: '2026-10-29T16:29:39.047Z'
    artifact_digest: 766c641e301a380d68ae355c5f05d747f52a25b7d1c75f5632caa1b72698544d
    contract_hash: b5af47d44e062a0d0b3461a38c7dd5582c54279b9f7a7b79395995d4a0cd3663
    binding_hash: 1bc020cbf8896349c82e718156d8e1f7488179e8f5c92cc07d45586bf97aa76b
    fingerprint: b60b1a5ee607cdd8c51240006876024a2c3d0530a6b40879fefdda47ba2d7486
    fingerprint_components:
      contract: b5af47d44e062a0d0b3461a38c7dd5582c54279b9f7a7b79395995d4a0cd3663
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
      - symbol_id: SYM-proof-telemetry-test-env-keys
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-telemetry-test-env-keys
      domain:
        symbol_id: SYM-const-test-env-keys
        members:
          - NODE_ENV=test
          - JEST_WORKER_ID
          - VITEST
          - VITEST_WORKER_ID
          - NODE_TEST_CONTEXT
      results:
        - member: NODE_ENV=test
          outcome: passed
        - member: JEST_WORKER_ID
          outcome: passed
        - member: VITEST
          outcome: passed
        - member: VITEST_WORKER_ID
          outcome: passed
        - member: NODE_TEST_CONTEXT
          outcome: passed
    certificate_digest: 854b52061daa400bf2b11f3fd741156f04dbaf6b364c1f72b684644ec3b4111f
    claim_bindings:
      - claim_key: CLAIM-25B6330588FD2199
        requirement_id: REQ-kibi-telemetry-automation-keys
        fact_id: FACT-telemetry-test-env-keys
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - JEST_WORKER_ID
            - NODE_ENV=test
            - NODE_TEST_CONTEXT
            - VITEST
            - VITEST_WORKER_ID
---
Proves that a test runner variable that silences telemetry shall be NODE_ENV=test, JEST_WORKER_ID, VITEST, VITEST_WORKER_ID or NODE_TEST_CONTEXT, against the code Kibi reads at ingest.