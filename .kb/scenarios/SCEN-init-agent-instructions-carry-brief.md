---
title: kibi init's AGENTS.md section holds every change step of the session brief
status: active
expects: success
tags:
  - agent-instructions
  - session-brief
origin:
  kind: agent
  recorded_at: '2026-11-26T11:41:12.262Z'
id: SCEN-init-agent-instructions-carry-brief
type: scenario
---
Given a workspace with Git and one without, when kibi init writes the managed Kibi section into AGENTS.md, then the section holds each change step of that workspace's session brief as its own line, unchanged, followed by the lines on whom to ask, firm-code edits, committing and the kibi-usage skill.
