---
title: MCP server that lists every tool without the full profile
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
value_set:
  - kb_query
  - kb_search
  - kb_status
  - kb_skills
  - kb_find_gaps
  - kb_coverage
  - kb_graph
  - kb_model
  - kb_upsert
  - kb_delete
  - kb_check
  - kb_prepare_impact_review
  - kb_plan_bootstrap
  - kb_compile_intent
  - kb_apply_plan
  - kb_ingest_proof
id: FACT-mcp-default-profile-every-tool-set
type: fact
---
Scenario input: an MCP server whose default profile lists all 16 tools, so each session loads every tool definition.