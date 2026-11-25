---
title: A second read of a linked file in the same session repeats no requirement row
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
Given a session in a Kibi workspace whose agent already read a linked source file and got its requirement rows, when the agent reads the same file again, then the hook adds nothing to the context, so no requirement is shown twice in that session.

The test case "a linked file shows one row per current requirement, once" in packages/claude/tests/hook-runner.test.ts exercises it through the Claude Code hook runner: the second Read returns no rows. It covers the value past the bound, `gt 1`, of times a requirement is shown per session.
