---
title: A reason given with the rule is asked for in why
status: active
expects: success
tags:
  - hooks
  - decision-capture
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:11:41.525Z'
id: SCEN-agent-hosts-stated-reason-asked
type: scenario
---
Given a prompt that says snippets must stay short because long ones get skipped, when the hook answers it, then the rule note and the later capture template quote the because clause and ask for it in why, for the Claude Code, Codex, Cursor and Z Code hooks.