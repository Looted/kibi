---
title: A Codex edit snippet that would run past its size budget is cut at the budget
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:22.964Z'
id: SCEN-CASE-agent-core-edit-snippets-OVER-BUDGET
type: scenario
---
Given a source file whose symbols implement more requirements than fit in the Codex snippet budget, when the Codex PreToolUse hook command describes an edit of it, then the context is cut to exactly the budget, ends with an ellipsis and still keeps the lead requirement, its grounding line and its decision line.

This covers the edge case of a host snippet over its own size budget, the value past the bound `gt 0`: the host contains it by capping. packages/codex/tests/hook-runner.test.ts "a file owning more requirements than fit is cut at the snippet budget after its grounding and decision" exercises it.
