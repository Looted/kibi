---
title: Proof steps and per-test report tests
status: passing
priority: must
tags:
  - proof
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T07:29:29.721Z'
id: TEST-kibi-proof-steps-directory
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-proof-steps-directory
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c3310171ff657fbab0473d2e
    test_id: TEST-kibi-proof-steps-directory
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 3997b094891d06b894ba185dfcc260f2f4afb17fbe8c5ffda6cc38a1603dedb5
    binding_hash: 09206bc3281a9ff5197bf4d64541956121f2def226d252b5abd023067216484c
    fingerprint: e078992c42f6f77fd66f8accebb3e3b0aecf4ae85d02fb456946002b6cc00c38
    fingerprint_components:
      contract: 3997b094891d06b894ba185dfcc260f2f4afb17fbe8c5ffda6cc38a1603dedb5
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
      - symbol_id: SYM-test-kibi-proof-steps-directory
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The step runner tests check that kibi proof run-steps reads proof/steps, one <test_id>.json file per test in name order, before proof/steps.json; falls back to proof/steps.json when the directory does not exist or proof/steps is a file; reads an explicit directory or file argument; and refuses a steps file whose test_id differs from its file name, as well as an array, null or a file without test_id, naming the file (packages/cli/tests/proof/step-runner-mutation.test.ts). The producer tests check the same reading and refusal in Kibi's own scripts/run-proof-producer.mjs (scripts/tests/run-proof-producer-remaining.coverage.test.ts), and the workflow contract test reads Kibi's own proof/steps directory (scripts/tests/proof-workflow-contract.test.ts).

The per-test report tests check that a command step receives the report path in KIBI_PROOF_TEST_REPORT, that a report must carry version kibi.proof-test-report.v1, and that each per-test outcome is one of passed, failed, timed_out, errored or interrupted, with any other outcome refused (packages/cli/tests/proof/command-test-report.test.ts, packages/cli/tests/proof/command-test-report-mutation.test.ts).

A false pass would be a test that writes only proof/steps.json and never a directory, one that never names a file after a different test, or one that never sends a report with an unknown outcome.