---
title: Codex, Cursor, ZCode and OpenCode do not pass such a change on silently
status: active
expects: rejection
text_ref: packages/agent-core/src/level-guard.ts
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:06:58.369Z'
id: SCEN-NEG-agent-hosts-guarded-change-notice-rejected
type: scenario
---
Given such a change, no one of these hooks grants it or passes it on without telling the agent to ask the person; OpenCode stops it once per session, and other edits get no such notice.
