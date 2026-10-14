---
title: An agent in Codex, Cursor or ZCode edits code under a firm rule and states a new one
status: active
priority: must
tags:
  - hooks
  - codex
  - cursor
  - zcode
  - capture
origin:
  kind: agent
  recorded_at: '2026-10-14T17:46:16.464Z'
id: SCEN-agent-hosts-decision-guard
type: scenario
---
Given a Kibi workspace in Codex, Cursor or ZCode where src/checkout.ts implements the firm requirement REQ-checkout-rounding, when the agent first edits computeTotal, the pre-edit hook tells it to ask the person before an edit that breaks that rule; a second edit in the same session is not told again. When the person submits "Totals must not be rounded from now on.", the agent gets the note that recording the rule with kb_upsert is part of the change (Codex and ZCode at once, Cursor with its next pre-edit message). When the session then stops after editing source with no kb_upsert, the stop hook asks once for the decision to be recorded; a session that wrote with kb_upsert is not asked.