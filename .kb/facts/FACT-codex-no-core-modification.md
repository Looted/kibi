---
title: kibi-codex does not modify core Kibi runtime components
status: active
fact_kind: property_value
subject_key: codex.kibi_plugin
property_key: modifies_core_runtime
operator: eq
value_type: bool
value_bool: false
claim_text: When kibi-codex is installed or enabled, it must not modify core Kibi runtime components
claim_key: CLAIM-AF104ACFA3569D00
text_ref: REQ-codex-kibi-plugin-v1
origin:
  kind: agent
  recorded_at: '2026-10-27T07:48:08.575Z'
id: FACT-codex-no-core-modification
type: fact
---
Installing or enabling kibi-codex leaves kibi-core, kibi-cli and kibi-mcp unchanged.