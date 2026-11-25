---
title: The Codex, Cursor and ZCode pre-edit hooks tell the agent to ask the person before a change of the Kibi level or a lowered required_evidence
status: active
fact_kind: property_value
subject_key: kibi.agent_hooks.guarded_change
property_key: codex_cursor_zcode_pre_edit_hooks_tell_agent_to_ask
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-1B7636EAA5FAFD6C
claim_text: Before an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Codex, Cursor or ZCode pre-edit hook must tell the agent to ask the person first
text_ref: packages/agent-core/src/level-guard.ts
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:06:51.267Z'
id: FACT-PROP-agent-hosts-guarded-change-notice-c01
type: fact
---
The Codex, Cursor and ZCode pre-edit hooks tell the agent to ask the person before a change of the Kibi level or a lowered required_evidence.
