---
title: A read over its configured limit fails with QUERY_LIMIT_EXCEEDED and returns no partial answer
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:09:14.184Z'
id: SCEN-NEG-core-engine-read-limits-PARTIAL-ANSWER
type: scenario
---
Given a consumer workspace whose full requirement query needs more than one inference, when a client runs kibi query and kibi search with KIBI_ENGINE_READ_INFERENCE_LIMIT set to 1, then each read fails with QUERY_LIMIT_EXCEEDED naming the exceeded limit instead of returning a truncated answer, and the next unbounded client is still served in full by the same engine.

This is the failure side of engine read limits: a partial answer would look complete to the caller. packages/cli/tests/consumer/engine-read-limits.test.ts "a read over its configured limit fails with QUERY_LIMIT_EXCEEDED and the engine keeps serving the next client" exercises it.
