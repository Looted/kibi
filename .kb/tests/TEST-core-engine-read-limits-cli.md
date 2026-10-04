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
---
# Consumer CLI reads over their engine limit fail with QUERY_LIMIT_EXCEEDED and the engine keeps serving other clients

Drives one engine through the built `kibi` binary with `KIBI_ENGINE_READ_INFERENCE_LIMIT` set for one client (`packages/cli/tests/consumer/engine-read-limits.test.ts`).

- The bounded client's `kibi query` and `kibi search` fail with `QUERY_LIMIT_EXCEEDED` and `error.details.limitExceeded`, never with a partial answer.
- The next, unbounded client is served in full by the same engine process, also when both reads are queued together.
- A limit the read fits in returns the complete answer, and a value that is not a positive integer bounds nothing.
