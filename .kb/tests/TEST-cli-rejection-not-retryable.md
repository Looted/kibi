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
    receipt_id: PR-6bf03c5c7716a701a736e49b
    test_id: TEST-cli-rejection-not-retryable
    scope: end_to_end
    outcome: passed
    code_snapshot: 82c684a8b795554d33923625b2bcf07425f1b3261fe27708a7d6c833f8e51711
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T17:54:02.760Z'
    finished_at: '2026-11-16T17:54:03.185Z'
    artifact_digest: c1c8e5955b59cbd25e7c5cb78d2da8f61f8c5e9c37666b8a32f04dcdeff72793
    contract_hash: e991b1c148dac0fe24f2309cc4f946a0f8e2aa60a95f065b0856df76175fe173
    binding_hash: a3817352ed56584808f95043291e728f786b7db8345965f4175e89365616450d
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