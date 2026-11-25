---
title: Read and search rows stay within their budgets (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:39:33.445Z'
id: SCEN-NEG-hook-read-row-budgets-OVER-BUDGET
type: scenario
---
Given reads whose code implements more requirements than the budgets allow, when a hook shows more than 3 rows in one event (5 for a whole file) or more than 10 rows or 2,300 characters in a session, then it is refused.
