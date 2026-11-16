---
title: 'Decision capture: a rule session gets the kb_upsert template once after its first source edit'
status: active
fact_kind: property_value
subject_key: kibi.claude_decision_capture
property_key: capture_templates_per_session
operator: eq
value_type: int
value_int: 1
claim_key: CLAIM-EA94FF6750C5A7CA
claim_text: After the first source edit of a session whose prompt reads as a rule, the hook must give the agent once per session a kb_upsert template for that requirement
text_ref: REQ-claude-decision-capture-nudges
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-claude-decision-capture-nudges
origin:
  kind: agent
  recorded_at: '2026-11-16T08:45:50.328Z'
id: FACT-claude-capture-template-once
type: fact
---
