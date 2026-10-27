---
title: kibi-cursor does not modify core Kibi runtime components
status: active
fact_kind: property_value
subject_key: cursor.kibi_plugin
property_key: modifies_core_runtime
operator: eq
value_type: bool
value_bool: false
claim_text: When kibi-cursor is installed or enabled, it must not modify core Kibi runtime components
claim_key: CLAIM-6B1861EAA48FF0C3
text_ref: REQ-cursor-kibi-plugin-v1
origin:
  kind: agent
  recorded_at: '2026-10-27T07:51:44.826Z'
id: FACT-cursor-no-core-modification
type: fact
---
Installing or enabling kibi-cursor leaves kibi-core, kibi-cli and kibi-mcp unchanged.