---
title: kibi-codex hooks only remind and warn
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: hooks_advisory_only
operator: eq
value_type: bool
value_bool: true
claim_text: kibi-codex hooks must only emit reminders and warnings
claim_key: CLAIM-61D8A2DB5D464944
text_ref: REQ-codex-kibi-plugin-v1
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:11.185Z'
id: FACT-codex-hooks-advisory-only
type: fact
---
Hooks add reminders and warnings to the agent context; they do not replace MCP tools.