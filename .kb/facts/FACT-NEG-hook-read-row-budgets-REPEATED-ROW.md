---
title: 'Forbidden: a requirement shown again in the same session'
status: active
fact_kind: property_value
subject_key: kibi.host.read_rows
property_key: repeated_requirement_rows
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:28:15.174Z'
id: FACT-NEG-hook-read-row-budgets-REPEATED-ROW
type: fact
---
A a requirement already shown this session, when a later read shows its row again leaves the agent without the rule, or floods it.
