---
title: 'Decision capture: an unrecorded session is asked once at stop'
status: active
fact_kind: property_value
subject_key: kibi.claude_decision_capture
property_key: stop_decision_asks_per_session
operator: eq
value_type: int
value_int: 1
claim_key: CLAIM-65BD1F78CFBC6AD0
claim_text: When a session that changed source files reaches its stop without any kb_upsert write, the Stop hook must ask the agent once per session to record the decision the person stated, quoting the prompt's rule phrase when one was detected, or to say why that phrase is not a rule
text_ref: REQ-claude-decision-capture-nudges
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-claude-decision-capture-nudges
origin:
  kind: agent
  recorded_at: '2026-10-14T16:57:40.292Z'
id: FACT-claude-capture-stop-once
type: fact
---
