---
title: A capture template without a why field
status: active
fact_kind: property_value
subject_key: kibi.agent_hosts_decision_guard
property_key: capture_templates_without_why_field
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T16:23:37.018Z'
id: FACT-NEG-agent-hosts-capture-template-why-NO-WHY
type: fact
---
A capture template without a why field lets the agent write a requirement with no reason, which kb_check then blocks for a missing Context section.