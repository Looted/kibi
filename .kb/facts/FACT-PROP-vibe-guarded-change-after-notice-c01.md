---
title: The Vibe hook tells the agent after a change of the Kibi level or a lowered required_evidence to ask the person
status: active
fact_kind: property_value
subject_key: kibi.agent_hooks.guarded_change
property_key: vibe_hook_tells_agent_after_change
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-DEC3C367E38662E2
claim_text: After an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Vibe hook must tell the agent to ask the person
text_ref: packages/agent-core/src/level-guard.ts
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:07:10.756Z'
id: FACT-PROP-vibe-guarded-change-after-notice-c01
type: fact
---
The Vibe hook tells the agent after a change of the Kibi level or a lowered required_evidence to ask the person.
