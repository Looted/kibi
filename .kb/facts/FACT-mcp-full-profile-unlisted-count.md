---
title: At level test, without the core tool profile, the MCP server leaves no tool unlisted
status: active
fact_kind: property_value
subject_key: kibi.mcp.tool_catalog
property_key: full_profile_unlisted_tool_count
operator: eq
value_type: int
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
claim_text: At level test, the MCP server must list every MCP tool unless the core tool profile is chosen
value_int: 0
claim_key: CLAIM-0847E496AC7607B2
id: FACT-mcp-full-profile-unlisted-count
type: fact
---
The MCP server must list every MCP tool unless the core tool profile is chosen, so outside the core profile no catalog tool is left unlisted. Grounds REQ-mcp-default-tool-profile.