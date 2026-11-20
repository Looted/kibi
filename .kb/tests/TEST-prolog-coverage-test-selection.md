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
    receipt_id: PR-e7ffdca0242eb88ae1b25464
    test_id: TEST-prolog-coverage-test-selection
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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