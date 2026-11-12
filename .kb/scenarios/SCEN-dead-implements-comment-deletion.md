---
title: An agent deletes dead implements comments without a confirmation
status: active
tags: []
origin:
  kind: agent
  recorded_at: '2026-11-12T13:47:29.404Z'
id: SCEN-dead-implements-comment-deletion
type: scenario
---
Given a source file whose symbol implements a firm requirement and that still carries an inline `// implements REQ-...` comment, when an agent's edit removes only that comment line, whether as a replacement edit, a whole-file write or an `apply_patch` edit, then the host hook does not ask the person to confirm the edit. When the same edit also changes a line of code, then the hook asks as for any edit of that symbol.

The comment is one Kibi no longer reads, so deleting it changes no behaviour the firm requirement governs. packages/agent-core/tests/decision-guard.test.ts, packages/claude/tests/hook-runner.test.ts, packages/codex/tests/hook-runner.test.ts and packages/zcode/tests/hook-runner.test.ts exercise both cases.
