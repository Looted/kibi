---
title: The kibi CLI sends a refused upsert as rejected with its rule, field and attempt, and never its content
status: passing
priority: should
tags:
  - telemetry
  - privacy
  - cli
  - agent-core
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-telemetry-expected-outcomes-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-telemetry-expected-outcomes-cli
    target: default
    native_id: packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts::kibi CLI telemetry outcomes (end to end)::a refused payload is sent as rejected with its code, and never its content
    source_file: packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts
    line: 93
origin:
  kind: agent
  recorded_at: '2026-11-03T13:38:46.014Z'
id: TEST-kibi-telemetry-expected-outcomes-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5499775a1bc7946b24bf30df
    test_id: TEST-kibi-telemetry-expected-outcomes-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: f60e6a5423f0b2f6f65a5f5cdfdf5a4444133304a6594f17d54e55ec8b79cdd1
    binding_hash: cd70826743ede51c1ce89563367ac34a24933dfeb056ec8e824446a6d5fa21b2
    fingerprint: 43ee71101b612042b653a84ce5e0379b1112fd7d5a327d7cba86da2f597ceaa5
    fingerprint_components:
      contract: f60e6a5423f0b2f6f65a5f5cdfdf5a4444133304a6594f17d54e55ec8b79cdd1
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 27efd3a6c31988211f5eb3ca2732e5ed597a7cdd145c566e21ca183e4f9d471f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-telemetry-expected-outcomes-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the real `kibi` binary in a new git workspace against a local stand-in for the PostHog batch endpoint (`packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts`).

It sends an upsert with an invalid status, an upsert without a type and the invalid entity again with one relationship, searches twice for words the KB does not hold, then runs enough commands to make the queue due. It checks that the upserts arrive as `rejected` with the categories `entity_validation_failed` and `validation_failed` and their exit codes; that the first names the rule `enum` and the field `status` as attempt 1 and the retry is attempt 2 after a `rejected` attempt with relationship count 1; that both searches report result count 0 and abstained, the second as a repeated search; that a successful command arrives as `success` with `telemetry_version` 2 and no error class; and that the sent payload holds neither the entity ids, the invalid value, the search words nor the workspace path.