---
title: OpenCode skips the host decision guard
status: active
fact_kind: property_value
subject_key: kibi.agent_hosts_decision_guard
property_key: opencode_runs_decision_guard
operator: eq
value_type: bool
value_bool: false
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T19:03:33.870Z'
id: FACT-NEG-opencode-decision-hooks-VIOLATED
type: fact
---
The OpenCode plugin edits without the rule note, the capture template, the firm-edit stop or the idle capture request the other hosts give.