---
title: Engine read limits stop runaway reads, never bound writes, and fail with QUERY_LIMIT_EXCEEDED
status: passing
tags:
  - engine
  - prolog
  - limits
  - query
verification_scope: integration
verification_perspective: internal
text_ref: packages/cli/tests/engine-read-limits.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:18:44.965Z'
id: TEST-core-engine-read-limits
type: test
---
# Engine read limits stop runaway reads, never bound writes, and fail with QUERY_LIMIT_EXCEEDED

Runs `packages/cli/tests/engine-read-limits.test.ts`: positive integer limits are accepted and the time limit is capped below the hard query timeout; opt-in limits are read from `KIBI_ENGINE_READ_TIME_LIMIT_MS` and `KIBI_ENGINE_READ_INFERENCE_LIMIT` and junk is ignored; a limit hit is recognized after an executor rewraps the message; against a real engine daemon a runaway read stops at its time limit and frees the queue for the next client, and an inference limit stops a read but never a write.
