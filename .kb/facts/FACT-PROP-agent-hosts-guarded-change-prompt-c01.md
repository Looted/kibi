---
title: The Claude Code pre-edit hook asks the person before a change of the Kibi level or a lowered required_evidence
status: active
fact_kind: property_value
subject_key: kibi.agent_hooks.guarded_change
property_key: claude_pre_edit_hook_asks_person
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-B584716FDF3B393D
claim_text: Before an edit that changes the Kibi level, or an edit, kb_upsert call or kb_record call that lowers a requirement's required_evidence, the Claude Code pre-edit hook must ask the person
text_ref: packages/agent-core/src/level-guard.ts
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T14:06:30.225Z'
id: FACT-PROP-agent-hosts-guarded-change-prompt-c01
type: fact
---
The Claude Code pre-edit hook asks the person before a change of the Kibi level or a lowered required_evidence.
