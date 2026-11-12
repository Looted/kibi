---
title: A comment-only deletion put to the person as a firm edit is caught
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - implements-comments
origin:
  kind: agent
  recorded_at: '2026-11-12T14:41:39.955Z'
id: SCEN-NEG-dead-implements-comment-deletion-FIRM-EDIT-ASKED
type: scenario
---
Given a source file whose symbol implements a firm requirement and that still carries an inline `// implements REQ-...` comment, when an agent's replacement edit or `apply_patch` edit removes only that comment and the hook treats it as an edit of the firm requirement's code, then the hook tests fail: they expect no confirmation and no firm-edit notice for that edit, and expect both once the same edit also changes code.

This is the failure side of the comment-only exemption. packages/claude/tests/hook-runner.test.ts, packages/codex/tests/hook-runner.test.ts and packages/zcode/tests/hook-runner.test.ts exercise it against a workspace whose file a firm requirement governs.
