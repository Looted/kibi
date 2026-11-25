---
title: Read and search rows stay within per-event and per-session budgets, each requirement once
status: active
expects: success
priority: must
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  recorded_at: '2026-11-25T14:28:17.451Z'
id: SCEN-hook-read-row-budgets
type: scenario
---
Given a session that already saw a requirement's row or its kb_query result, when the agent reads code that implements it again, then the hook adds no row for it and never exceeds 3 rows per event or 10 rows and 2,300 characters per session.
