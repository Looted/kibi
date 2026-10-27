---
title: Curated suite batch runner surfaces actionable failure diagnostics
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-root-batch-diagnostics
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-root-batch-diagnostics
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a701e4e91bc4af6d74c3e696
    test_id: TEST-e2e-root-batch-diagnostics
    scope: end_to_end
    outcome: passed
    code_snapshot: 287d8b7e21fc5ebfe33742e839feb2dd6ab1c5b91349284c293a90ceeeb17a0c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T10:17:58.279Z'
    finished_at: '2026-10-27T10:17:58.486Z'
    artifact_digest: 986ae36aa78372e9282f02a9d4711b5b8f284224821327eb5c5db9a40a6a7bf3
    contract_hash: c087ad48ac9a2f5fc8910215aaa825524f3dd4e8eca9c1da50bfc262729ff5f7
    binding_hash: 6f305815f84b80cad7bc94b4589827c1f5fbaa3a1f4159d1c009662eeb78e10a
    fingerprint: 8e1dc5fbf12bc3e17485a3d3fc4f4bfe0ca9ccf002ac2399a0cc5ed2c54f2e7e
    fingerprint_components:
      contract: c087ad48ac9a2f5fc8910215aaa825524f3dd4e8eca9c1da50bfc262729ff5f7
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
      - symbol_id: SYM-e2e-test-root-batch-diagnostics
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
tags:
  - review:context-missing
---
