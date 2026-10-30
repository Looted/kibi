---
title: A host stop hook would ask for the decision record a second time in one session
status: active
fact_kind: property_value
subject_key: kibi.agent_hosts_decision_guard
property_key: stop_decision_asks_per_session
operator: eq
value_type: int
value_int: 2
origin:
  kind: agent
  recorded_at: '2026-10-30T15:02:28.208Z'
id: FACT-CASE-agent-hosts-decision-guard-second-stop-ask
type: fact
---
The attempt the stop hook must contain: a second stop in the same unrecorded session asking for the decision again.