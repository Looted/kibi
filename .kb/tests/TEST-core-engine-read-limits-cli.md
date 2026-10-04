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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1081628f4751708073d680f1
    test_id: TEST-core-engine-read-limits-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: f0fd27d161e0f366d0e4027f08bc1530db0ab8379a4a8d6801b80cf635d125ea
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-04T06:02:22.175Z'
    finished_at: '2026-10-04T06:02:27.009Z'
    artifact_digest: 3fbf357786f6a78e277afde419a92c3229981e293b9e6e6e22269b1deb285e22
    contract_hash: 02b52a831815fd95b32a33bc700fafc9fed6262b53e26ee0cd004a9ea9045e00
    binding_hash: 51e53d411b2313119165dedebf9acf275ca0d84b766f5c46bac102e2720bf414
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
---
# Consumer CLI reads over their engine limit fail with QUERY_LIMIT_EXCEEDED and the engine keeps serving other clients

Drives one engine through the built `kibi` binary with `KIBI_ENGINE_READ_INFERENCE_LIMIT` set for one client (`packages/cli/tests/consumer/engine-read-limits.test.ts`).

- The bounded client's `kibi query` and `kibi search` fail with `QUERY_LIMIT_EXCEEDED` and `error.details.limitExceeded`, never with a partial answer.
- The next, unbounded client is served in full by the same engine process, also when both reads are queued together.
- A limit the read fits in returns the complete answer, and a value that is not a positive integer bounds nothing.
