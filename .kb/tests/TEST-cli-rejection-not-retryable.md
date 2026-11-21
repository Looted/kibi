---
title: CLI error envelope retryability tests
status: passing
priority: must
tags:
  - cli
  - errors
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T14:40:49.907Z'
id: TEST-cli-rejection-not-retryable
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-rejection-not-retryable
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7edb4770af45ac2c51478519
    test_id: TEST-cli-rejection-not-retryable
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e991b1c148dac0fe24f2309cc4f946a0f8e2aa60a95f065b0856df76175fe173
    binding_hash: b5bec2dd41f8233c3f4be75e633312b0ba4f0a3eb6b8b01363d1d4509fba1fef
    fingerprint: aea76b0c6fa52a03963275da65739690774d5e3db26d0e1e61659746d59f3a18
    fingerprint_components:
      contract: e991b1c148dac0fe24f2309cc4f946a0f8e2aa60a95f065b0856df76175fe173
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
      - symbol_id: SYM-test-cli-rejection-not-retryable
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The CLI protocol tests (packages/cli/tests/cli-protocol-mutation.test.ts) run stubbed operations through executeOperation and assert the printed error envelope: a KB rejection, thrown directly or as the cause of a wrapping error, and an OperationError refusal such as SOURCE_PATH_INVALID report retryable false, PROTOCOL_VALIDATION_FAILED reports retryable false, and a plain unexplained error or a non-Error throw reports retryable true. The error tests (packages/cli/tests/cli-errors.test.ts) assert OperationError is not retryable unless told so, codedErrorOf reads a bundled OperationError copy without a retryable field as not retryable, and isKbRejection finds a rejection through up to five wrapping causes. The proof explain tests (packages/cli/tests/operations-mutation/proof/explain.test.ts) assert PROLOG_UNAVAILABLE is not retryable.

A false pass would be a test that checks only the error code or message, since every rejection reports OPERATION_FAILED and only the retryable flag tells the agent not to resend the call.