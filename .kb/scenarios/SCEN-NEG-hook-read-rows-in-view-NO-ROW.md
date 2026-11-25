---
title: Read and search hooks show the requirements of the code in view (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:26:52.082Z'
id: SCEN-NEG-hook-read-rows-in-view-NO-ROW
type: scenario
---
Given a read of linked code within the budgets, when the hook adds nothing about the requirements of the symbols in view, then it is refused.
