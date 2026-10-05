---
title: A runaway read stops at its configured limit with QUERY_LIMIT_EXCEEDED and the next client is served
status: active
priority: should
tags:
  - engine
  - prolog
  - limits
origin:
  kind: agent
  recorded_at: '2026-10-04T02:18:46.751Z'
id: SCEN-core-engine-read-limits
type: scenario
---
# A runaway read stops at its configured limit with QUERY_LIMIT_EXCEEDED and the next client is served

Given `KIBI_ENGINE_READ_TIME_LIMIT_MS` is set for the engine
When a read-only request runs longer than the limit
Then the request fails with `QUERY_LIMIT_EXCEEDED` and `error.details.limitExceeded` naming the limit kind and value, without a partial answer
And the next client's request is served.

Given `KIBI_ENGINE_READ_INFERENCE_LIMIT` is set
When a write, a module load or sync compilation runs
Then it is not bounded by the limit.

Given neither variable is set
When any read runs
Then it is not bounded.
