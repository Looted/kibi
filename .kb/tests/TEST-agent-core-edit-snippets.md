---
title: Every host shows the shared edit snippet with what the lead requirement must keep true and its decision, never for retired policy
status: passing
tags:
  - hooks
  - snippets
  - agent-core
  - claude
  - cursor
  - codex
  - zcode
  - opencode
verification_scope: integration
verification_perspective: internal
text_ref: packages/agent-core/tests/snippets.test.ts; packages/claude/tests/hook-runner.test.ts; packages/cursor/tests/pre-edit-guidance.test.ts; packages/codex/tests/hook-runner.test.ts; packages/zcode/tests/hook-runner.test.ts; packages/opencode/tests/edit-knowledge.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:41:49.298Z'
id: TEST-agent-core-edit-snippets
type: test
---
# Every host shows the shared edit snippet with what the lead requirement must keep true and its decision, never for retired policy

Runs `packages/agent-core/tests/snippets.test.ts` (`requirement grounding`, `shared file knowledge snippet` and `once-per-session edit context`: linked facts and the decision behind a current requirement, nothing for a retired or ungrounded one, edits add grounding and reads do not, a superseded lead requirement gets no grounding lines, each host's size budget caps the snippet) and the host hook tests that drive the shared builder: `packages/claude/tests/hook-runner.test.ts` (including grounding stored only in relationship shards), `packages/cursor/tests/pre-edit-guidance.test.ts` (including a read of a linked file without edit grounding), `packages/codex/tests/hook-runner.test.ts` and `packages/zcode/tests/hook-runner.test.ts` (including once per file per session) and `packages/opencode/tests/edit-knowledge.test.ts`.
