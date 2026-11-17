---
title: The MCP server must list only kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status and kb_skills unless the full tool profile is chosen
status: active
fact_kind: property_value
subject_key: kibi.mcp.tool_catalog
property_key: default_profile_tools
operator: eq
value_type: set
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
claim_text: The MCP server must list only kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status and kb_skills unless the full tool profile is chosen
claim_key: CLAIM-7DDAFB6E5A4B6A32
value_set:
  - kb_search
  - kb_query
  - kb_record
  - kb_upsert
  - kb_check
  - kb_status
  - kb_skills
id: FACT-mcp-default-profile-tools
type: fact
---
The default profile lists exactly kb_search, kb_query, kb_upsert, kb_check, kb_status and kb_skills. Kibi proves this set against DEFAULT_PROFILE_TOOLS with an exhaustive certificate. Grounds REQ-mcp-default-tool-profile.