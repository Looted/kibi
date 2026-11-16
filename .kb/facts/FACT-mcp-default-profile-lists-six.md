---
title: The MCP server must list only kb_search, kb_query, kb_upsert, kb_check, kb_status and kb_skills unless the full tool profile is chosen
status: active
fact_kind: property_value
subject_key: kibi.mcp.tool_catalog
property_key: default_profile_lists_six_core_tools
operator: eq
value_type: bool
value_bool: true
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
claim_text: The MCP server must list only kb_search, kb_query, kb_upsert, kb_check, kb_status and kb_skills unless the full tool profile is chosen
claim_key: CLAIM-C7E3D235BB6D6979
id: FACT-mcp-default-profile-lists-six
type: fact
---
The MCP server must list only kb_search, kb_query, kb_upsert, kb_check, kb_status and kb_skills unless the full tool profile is chosen. Grounds REQ-mcp-default-tool-profile.