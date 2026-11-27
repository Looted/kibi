---
title: Claude Code and Antigravity do not let such a change through unasked
status: active
expects: rejection
text_ref: packages/agent-core/src/level-guard.ts
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:06:37.957Z'
id: SCEN-NEG-agent-hosts-guarded-change-prompt-rejected
type: scenario
---
Given such a change, neither pre-edit hook allows it without asking the person; an edit that keeps the level, a raise of a floor and a dry run get no such prompt.
