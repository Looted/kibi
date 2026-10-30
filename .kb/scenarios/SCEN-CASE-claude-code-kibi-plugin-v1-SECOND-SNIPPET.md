---
title: A second read of a linked file in the same session gets no second knowledge snippet
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:53:28.934Z'
id: SCEN-CASE-claude-code-kibi-plugin-v1-SECOND-SNIPPET
type: scenario
---
Given a session in a Kibi workspace whose agent already read a linked source file and got its knowledge snippet, when the agent reads the same file again, then the hook adds nothing to the context, so the file never gets a second snippet in that session.

The test case "a linked file shows requirement titles, symbols, tests, and next calls once" in packages/claude/tests/hook-runner.test.ts exercises it through the Claude Code hook runner: the second Read returns no snippet. It covers the value past the bound, `gt 1`, of knowledge snippets per file per session.