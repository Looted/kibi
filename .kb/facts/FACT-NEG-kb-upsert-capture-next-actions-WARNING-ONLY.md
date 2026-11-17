---
title: A blocking step left as a warning only
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: blocking_steps_left_as_warnings_only
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T16:11:16.851Z'
id: FACT-NEG-kb-upsert-capture-next-actions-WARNING-ONLY
type: fact
---
A requirement write that reports a step kb_check blocks on only as warning text, with no nextActions entry, leaves the agent to rebuild the call itself.