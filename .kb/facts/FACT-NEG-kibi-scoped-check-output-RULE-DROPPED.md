---
title: A scoped kb_check cut to its budget drops one blocking rule
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: mcp.kb_check
property_key: blocking_rules_dropped_by_budget
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-11-15T18:50:00.000Z'
id: FACT-NEG-kibi-scoped-check-output-RULE-DROPPED
type: fact
---
Cutting a scoped kb_check result to its 24,000-character budget removes every violation of one blocking rule, so the result no longer says that rule blocks.
