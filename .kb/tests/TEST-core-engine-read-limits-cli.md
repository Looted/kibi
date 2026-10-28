---
title: Consumer CLI reads over their engine limit fail with QUERY_LIMIT_EXCEEDED and the engine keeps serving other clients
status: passing
priority: must
tags:
  - engine
  - read-limits
  - prolog
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-core-engine-read-limits-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-core-engine-read-limits-cli
    target: default
    native_id: packages/cli/tests/consumer/engine-read-limits.test.ts::engine read limits through the kibi CLI::a read over its configured limit fails with QUERY_LIMIT_EXCEEDED and the engine keeps serving the next client
    source_file: packages/cli/tests/consumer/engine-read-limits.test.ts
    line: 116
origin:
  kind: agent
  recorded_at: '2026-10-04T05:28:52.094Z'
id: TEST-core-engine-read-limits-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cd614169599d43a9bd919be9
    test_id: TEST-core-engine-read-limits-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 7e969ef237f833cbd278efff81b932f3dfabb54a084313f49df8411b804224eb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:32:14.463Z'
    finished_at: '2026-10-28T10:32:20.224Z'
    artifact_digest: 8f0bd9292ee02e437d63b77faf6e21310890060d6e5b07c1cbf5776671cf35f7
    contract_hash: 02b52a831815fd95b32a33bc700fafc9fed6262b53e26ee0cd004a9ea9045e00
    binding_hash: cf1a09516730922ae853133328f6e6ef4f96b820f4681041f5b99ce46c312b80
    fingerprint: e4a304a2173367012c5a35e569f7b4a766338a306c8dfca0c358b61433f6f6f1
    fingerprint_components:
      contract: 02b52a831815fd95b32a33bc700fafc9fed6262b53e26ee0cd004a9ea9045e00
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: b23a65dfb6c98568af6a7c21a16c0e96477f06363dc4fefd03b7ad21aa936690
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-core-engine-read-limits-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# Consumer CLI reads over their engine limit fail with QUERY_LIMIT_EXCEEDED and the engine keeps serving other clients

Drives one engine through the built `kibi` binary with `KIBI_ENGINE_READ_INFERENCE_LIMIT` set for one client (`packages/cli/tests/consumer/engine-read-limits.test.ts`).

- The bounded client's `kibi query` and `kibi search` fail with `QUERY_LIMIT_EXCEEDED` and `error.details.limitExceeded`, never with a partial answer.
- The next, unbounded client is served in full by the same engine process, also when both reads are queued together.
- A limit the read fits in returns the complete answer, and a value that is not a positive integer bounds nothing.
