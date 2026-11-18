---
title: A scoped kb_check leaves out one blocking violation without counting it
status: active
tags:
  - negative-path
fact_kind: property_value
subject_key: mcp.kb_check
property_key: omitted_blocking_violations_left_uncounted
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-11-15T18:50:00.000Z'
id: FACT-NEG-kibi-scoped-check-output-UNCOUNTED-VIOLATION
type: fact
---
A blocking violation the scoped result does not list is also missing from its count and from omittedViolations, so the result reads as passing while the KB still blocks.
