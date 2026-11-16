---
title: A passing check spreads its verdict over several lines or names every rule
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: pass_verdict_lines
operator: gt
value_type: int
value_int: 1
tags:
  - negative-path
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
id: FACT-NEG-check-pass-one-line-RULES-LISTED
type: fact
---
The failure side of the rule: a passing check prints its verdict, rule count and debt on more than one line, or kb_check names every rule of a full run.