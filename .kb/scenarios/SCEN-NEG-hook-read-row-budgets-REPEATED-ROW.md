---
title: Read and search rows stay within per-event and per-session budgets, each requirement once (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:28:18.506Z'
id: SCEN-NEG-hook-read-row-budgets-REPEATED-ROW
type: scenario
---
Given a requirement already shown this session, when a later read shows its row again, then it is refused.
