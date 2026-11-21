---
title: Coverage runner processes every selected Prolog test file
status: passing
tags:
  - prolog
  - coverage
  - testing
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-coverage-test-selection
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-coverage-test-selection
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9d270ce1fc2e0941f050ef17
    test_id: TEST-prolog-coverage-test-selection
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 5a99f6adc5e51ba4028f5746fddfe2424201f098701e05bcaf13350df58c2b45
    binding_hash: 8e4c204900b1d498c9acdb7bdffb8534008def7b3f1829c6e6ffd00fc651c95c
    fingerprint: 25cdec471c980186f23e9a502d3446e14c2263b22b3b9bd786efd12bb3484f26
    fingerprint_components:
      contract: 5a99f6adc5e51ba4028f5746fddfe2424201f098701e05bcaf13350df58c2b45
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
      - symbol_id: SYM-test-prolog-coverage-test-selection
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
Run `bun test ./packages/core/tests/prolog-coverage-runner.test.ts`. The repeated-option case supplies a passing file followed by a failing file in another directory, then checks the later case is reported, the run fails, and the later file appears among annotated coverage artifacts. The suite also checks threshold failure and a fully covered success case.