---
title: An apply cut off mid-action resumes from its journal
status: active
priority: must
tags:
  - bootstrap
  - mcp
  - recovery
expects: success
origin:
  kind: agent
  recorded_at: '2026-10-07T12:27:56.480Z'
id: SCEN-bootstrap-apply-long-running
type: scenario
---
Given an approved bootstrap plan applied over MCP with a progress token, when each action commits, then the client receives a progress notification. Given the server dies after an action commits but before its checkpoint, leaving its source lock behind, when the agent calls kb_apply_plan with the recovery journal id, then the dead holder's lock is reclaimed and recorded, the interrupted action is re-applied, the remaining actions apply, and nothing in .kb/recovery is edited by hand. A lock whose holder is alive still blocks, and drift with no interrupted action is still refused.

The case comes from an evaluation run where a 374-action plan outlasted a 60 second client timeout.