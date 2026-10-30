---
title: 'Host decision guard: an unrecorded session is asked once at stop'
status: active
fact_kind: property_value
subject_key: kibi.agent_hosts_decision_guard
property_key: stop_decision_asks_per_session
operator: eq
value_type: int
value_int: 1
claim_key: CLAIM-0B8E0F35E08185E6
claim_text: When a session that changed source files stops without any kb_upsert write, the Codex, Cursor, ZCode stop hooks must ask the agent once per session to record the decision behind the change
text_ref: REQ-agent-hosts-decision-guard
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-agent-hosts-decision-guard
origin:
  kind: agent
  recorded_at: '2026-10-14T17:46:15.890Z'
id: FACT-agent-hosts-capture-stop-once
type: fact
---
