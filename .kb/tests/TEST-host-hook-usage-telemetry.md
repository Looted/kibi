---
title: Host plugin hooks write shared opt-in hook usage rows
status: passing
tags:
  - telemetry
  - hooks
  - agent-core
  - claude
  - cursor
  - codex
  - zcode
  - opencode
verification_scope: unit
verification_perspective: internal
text_ref: packages/agent-core/tests/snippets.test.ts; packages/claude/tests/hook-runner.test.ts; packages/codex/tests/hook-runner.test.ts; packages/cursor/tests/pre-edit-guidance.test.ts; packages/zcode/tests/hook-runner.test.ts; packages/opencode/tests/edit-knowledge.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:12:50.681Z'
id: TEST-host-hook-usage-telemetry
type: test
---
# Host plugin hooks write shared opt-in hook usage rows

Runs the shared hook telemetry suite (`packages/agent-core/tests/snippets.test.ts`, "shared hook telemetry rows") and each host's opt-in telemetry suite: `packages/claude/tests/hook-runner.test.ts` ("usage telemetry"), `packages/codex/tests/hook-runner.test.ts` ("Codex opt-in hook telemetry"), `packages/cursor/tests/pre-edit-guidance.test.ts` ("opt-in hook telemetry"), `packages/zcode/tests/hook-runner.test.ts` ("ZCode opt-in hook telemetry") and `packages/opencode/tests/edit-knowledge.test.ts` ("opt-in tool telemetry").

They check that no row is written unless `KIBI_DIAGNOSTIC_MODE` is set, that rows carry `interface: hook`, the host, the session id, `kb_usage` lookups and `edited` paths with the requirement ids the file's symbols implement.
