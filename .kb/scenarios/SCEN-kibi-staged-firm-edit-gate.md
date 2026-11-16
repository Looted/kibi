---
title: A staged edit of firm code passes once the agent has recorded that it keeps the rule
status: active
expects: success
tags:
  - firmness
  - check
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T06:59:49.223Z'
id: SCEN-kibi-staged-firm-edit-gate
type: scenario
---
Given a staged change inside a symbol that implements a current firm requirement, when kibi check --staged runs without a matching receipt, then it blocks with firm_edit_unreviewed and prints the kibi review-firm-edit input. After the agent records a keeps receipt for that requirement and symbol and stages it, the same check passes.