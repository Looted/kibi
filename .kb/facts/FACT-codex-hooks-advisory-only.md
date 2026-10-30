---
title: kibi-codex hooks never deny a tool call
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: hook_outcome_kinds
operator: subset_of
value_type: set
value_set:
  - reminder
  - stop_continuation
  - warning
claim_text: 'kibi-codex hooks must never deny a tool call: they add reminders and warnings, and at Stop they ask the agent to continue'
claim_key: CLAIM-2104EF055497A0C9
text_ref: REQ-codex-kibi-plugin-v1
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:11.185Z'
id: FACT-codex-hooks-advisory-only
type: fact
---
Hooks add reminders and warnings to the agent context, and the Stop hook may ask the agent to continue the turn once. No hook denies a tool call, and hooks do not replace MCP tools.