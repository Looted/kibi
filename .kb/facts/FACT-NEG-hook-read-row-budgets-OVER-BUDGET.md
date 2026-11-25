---
title: 'Forbidden: rows beyond the per-event or per-session budget'
status: active
fact_kind: property_value
subject_key: kibi.host.read_rows
property_key: rows_beyond_budget
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T14:39:31.306Z'
id: FACT-NEG-hook-read-row-budgets-OVER-BUDGET
type: fact
---
A read that shows a fourth row in one event, or an eleventh row in a session, floods the agent with context it did not ask for.
