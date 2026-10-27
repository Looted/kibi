---
title: kibi-cursor hooks do not write to .kb
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: hooks_write_kb
operator: eq
value_type: bool
value_bool: false
claim_text: kibi-cursor hooks must not write to the .kb directory
claim_key: CLAIM-E5CB2AA3485D7A30
text_ref: REQ-cursor-kibi-plugin-v1
origin:
  kind: agent
  recorded_at: '2026-10-27T07:51:48.847Z'
id: FACT-cursor-hooks-no-kb-writes
type: fact
---
KB changes go through the Kibi CLI or MCP tools, never through the hooks.