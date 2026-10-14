---
title: An agent edits code that a firm requirement governs
status: active
priority: must
tags:
  - hooks
  - claude-code
  - firmness
origin:
  kind: agent
  recorded_at: '2026-10-14T16:57:09.022Z'
id: SCEN-claude-firm-edit-confirmation
type: scenario
---
Given computeTotal implements the firm requirement "Checkout totals round to cents", when an agent is about to edit a line inside computeTotal, then Claude Code shows the person a permission prompt naming computeTotal and the requirement, and the agent is told that a declined edit means the requirement stands. When the person allows the edit, a later edit of the same requirement's code in that session goes through without a prompt; when the person declines, the next attempt asks again. An edit in a symbol that implements only a superseded or agent-written requirement, or with KIBI_CONFIRM_FIRM_EDITS=0, is not asked about.