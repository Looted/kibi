---
title: MCP server that lists every tool without the full profile
status: active
fact_kind: property_value
subject_key: kibi.mcp.tool_catalog
property_key: default_profile_lists_six_core_tools
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
id: FACT-mcp-default-profile-lists-every-tool
type: fact
---
Scenario input: an MCP server that lists all 16 tools in every session, so each session loads every tool definition.