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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-33f5c346d4bbdd45c6394f5f
    test_id: TEST-prolog-coverage-test-selection
    scope: end_to_end
    outcome: passed
    code_snapshot: 929a2bffbc0505e38bf19d595788f7d828560a5dcbc0657e4f5b5e9cbbc6d807
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T09:32:11.717Z'
    finished_at: '2026-09-30T09:32:12.536Z'
    artifact_digest: 531219adf0b838fa24309221a0d3d5d1afd93059ec2ea40c19213ffe70521819
    contract_hash: 5a99f6adc5e51ba4028f5746fddfe2424201f098701e05bcaf13350df58c2b45
    binding_hash: f2f374dd2fe61c02f243597669ebc58e51ea93804557f5fe0bc6f3ce005887b8
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c2e2b1fb4c0c85d57541a8b9
    test_id: TEST-prolog-coverage-test-selection
    scope: end_to_end
    outcome: passed
    code_snapshot: 929a2bffbc0505e38bf19d595788f7d828560a5dcbc0657e4f5b5e9cbbc6d807
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T09:34:29.510Z'
    finished_at: '2026-09-30T09:53:47.264Z'
    artifact_digest: bf1056b84a11011e16a37703ce5da52de1172c40ecacc8002976e09efa49291d
    contract_hash: 5a99f6adc5e51ba4028f5746fddfe2424201f098701e05bcaf13350df58c2b45
    binding_hash: f2f374dd2fe61c02f243597669ebc58e51ea93804557f5fe0bc6f3ce005887b8
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
---
Run `bun test ./packages/core/tests/prolog-coverage-runner.test.ts`. The repeated-option case supplies a passing file followed by a failing file in another directory, then checks the later case is reported, the run fails, and the later file appears among annotated coverage artifacts. The suite also checks threshold failure and a fully covered success case.