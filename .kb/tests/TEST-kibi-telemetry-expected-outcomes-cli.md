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
    receipt_id: PR-4610a279a74c076a6b1a85ce
    test_id: TEST-kibi-telemetry-expected-outcomes-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 50b51c3ad5a6f40637c27165dbdf5bf7bb49b7dfdbd3465be4bc86e3cb482007
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-03T14:30:35.425Z'
    finished_at: '2026-11-03T14:30:48.655Z'
    artifact_digest: acb681fe11733d12e5be043f01664cd19e312ab62f7d8fc8008e484a94d21b3b
    contract_hash: f60e6a5423f0b2f6f65a5f5cdfdf5a4444133304a6594f17d54e55ec8b79cdd1
    binding_hash: ea2510d2f9576c3c51b9bfc4526800f91b7ab1b89de4dce0b37c5280fda82e18
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