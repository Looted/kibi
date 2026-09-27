---
title: Verify Claude Code Kibi plugin hooks, distribution, and opt-in behavior
status: active
priority: must
verification_scope: integration
verification_perspective: consumer
tags:
  - claude-code
  - plugin
  - hooks
id: TEST-claude-code-kibi-plugin-v1
type: test
---
# Verify the Claude Code Kibi plugin hooks, distribution, and opt-in behavior

Run with `bun test ./packages/claude`.

- `tests/hook-runner.test.ts`: snippet content, per-session dedupe, read-window and edit focus, suppression after Kibi exploration, the unowned-file note, the one-shot `.kb/` and search notes, Stop reminders and their acknowledgment by host-prefixed MCP and CLI checks, session isolation, silence outside Kibi workspaces, and the advisory boundary (no deny, no input rewrite, no workspace writes).
- `tests/knowledge-index.test.ts`: the manifest line scanner matches a full YAML parse on writer and hand-authored layouts; cache reuse and invalidation; entity summary lookup cannot escape its lane.
- `tests/distribution.test.ts`: the committed hook bundle matches the source and runs under Node; concurrent hook processes keep every journal event; manifests reference shipped files; skill names equal skill ids; the package has no install lifecycle; the MCP launcher exposes no tools outside Kibi workspaces.
