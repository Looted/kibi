---
title: kibi-codex hooks do not write to .kb
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: hooks_write_kb
operator: eq
value_type: bool
value_bool: false
claim_text: kibi-codex hooks must not write to the .kb directory
claim_key: CLAIM-7A8F343AFD3A94F0
text_ref: REQ-codex-kibi-plugin-v1
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:12.390Z'
id: FACT-codex-hooks-no-kb-writes
type: fact
---
KB changes go through the Kibi CLI or MCP tools, never through the hooks.