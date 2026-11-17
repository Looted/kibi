---
title: A default MCP tool profile without kb_record
status: active
fact_kind: property_value
subject_key: kibi.mcp.tool_catalog
property_key: default_profiles_without_kb_record
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:18.127Z'
id: FACT-NEG-mcp-default-profile-lists-kb-record-NOT-LISTED
type: fact
---
A default MCP tool profile that left kb_record out would make agents reach for kb_upsert for the first write of a rule.
