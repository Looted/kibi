---
title: kibi-cursor hooks only remind and warn
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: hooks_advisory_only
operator: eq
value_type: bool
value_bool: true
claim_text: kibi-cursor hooks must only emit reminders and warnings
claim_key: CLAIM-915BBD5BF9462870
text_ref: REQ-cursor-kibi-plugin-v1
origin:
  kind: agent
  recorded_at: '2026-10-27T07:51:47.558Z'
id: FACT-cursor-hooks-advisory-only
type: fact
---
Hooks add reminders and warnings to the agent context; they do not replace MCP tools.