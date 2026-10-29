---
title: Anonymous usage telemetry queues summary events, honors opt-outs and survives send failures
status: passing
tags:
  - telemetry
  - privacy
  - agent-core
  - cli
  - mcp
verification_scope: unit
verification_perspective: internal
text_ref: packages/agent-core/tests/usage-telemetry.test.ts; packages/cli/tests/usage-telemetry.test.ts; packages/mcp/tests/usage-telemetry.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-29T09:37:22.717Z'
id: TEST-kibi-anonymous-usage-telemetry
type: test
---
Runs the shared telemetry suite (`packages/agent-core/tests/usage-telemetry.test.ts`) and the CLI and MCP suites (`packages/cli/tests/usage-telemetry.test.ts`, `packages/mcp/tests/usage-telemetry.test.ts`).

They check that telemetry is on by default and off under every opt-out, in CI and under test runners, that `kibi telemetry disable` persists and deletes the queue, that the first-run notice appears once, that a sent batch holds only the allowed summary fields with a hashed session id and a stable install id, that the CLI names commands by their registered path without arguments, that MCP events carry the fixed error category but not the error message, and that failed sends keep events for the next flush while rejected batches are dropped.