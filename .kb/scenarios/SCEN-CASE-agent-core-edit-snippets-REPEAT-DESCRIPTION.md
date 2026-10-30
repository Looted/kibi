---
title: A second description of the same linked file in one Codex session is withheld
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:26.002Z'
id: SCEN-CASE-agent-core-edit-snippets-REPEAT-DESCRIPTION
type: scenario
---
Given a Codex session whose first apply_patch to requirement-linked code already received the edit snippet, when a second PreToolUse hook process handles another edit of the same file in the same session, then it returns no additional context, and only a new session gets the snippet again.

This covers the edge case of a second description per linked file per session, the value past the bound `gt 1`. packages/codex/tests/hook-runner.test.ts "the PreToolUse command gives an apply_patch to linked code its requirement, what it must keep true and its decision, once per session" exercises it through the hook command.
