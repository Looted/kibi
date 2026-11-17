---
title: Hooks recommend the commit gate's verdict after an edit
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: hook_check_calls_without_changed
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - hooks
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T18:30:00.000Z'
claim_key: CLAIM-19561F00B5A95992
claim_text: The Kibi hook messages that name the check to run after a source edit, in agent-core and in the Claude Code, Codex, Cursor, OpenCode and ZCode adapters, must name kb_check with changed:true for the edited files, and such a call must count as the impact check those hooks ask for
id: FACT-hooks-recommend-changed-check
type: fact
text_ref: REQ-hooks-recommend-changed-check
---
The grounded claim of REQ-hooks-recommend-changed-check: The Kibi hook messages that name the check to run after a source edit, in agent-core and in the Claude Code, Codex, Cursor, OpenCode and ZCode adapters, must name kb_check with changed:true for the edited files, and such a call must count as the impact check those hooks ask for.