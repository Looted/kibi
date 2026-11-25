---
title: Vibe does not stay silent after such a change
status: active
expects: rejection
text_ref: packages/agent-core/src/level-guard.ts
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:07:16.074Z'
id: SCEN-NEG-vibe-guarded-change-after-notice-rejected
type: scenario
---
Given such a change, the Vibe hook tells the agent to ask the person; a raise of a floor, a dry run, and a whole-file write with no earlier text to compare get no such notice.
