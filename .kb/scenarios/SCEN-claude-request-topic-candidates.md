---
title: An agent edits an unlinked file the request describes
status: active
priority: must
tags:
  - hooks
  - claude-code
  - impact
origin:
  kind: agent
  recorded_at: '2026-10-14T16:57:44.681Z'
id: SCEN-claude-request-topic-candidates
type: scenario
---
Given the requirement "Checkout totals round to cents" and a request "Change how checkout totals are rounded for refunds.", when the agent is about to create src/refunds.ts, which no symbol links, then the note names the checkout rounding requirement as a candidate although the path shares none of its words. In a session without that request the note says that nothing recorded is known to cover the file and that a decision made for it is recorded with kb_upsert before the work is reported done.