---
title: MCP server whose full profile at level remember lists the planning and coverage tools too
status: active
fact_kind: property_value
subject_key: kibi.mcp.tool_catalog
property_key: remember_full_profile_tools
operator: eq
value_type: set
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
  - kb_record
  - kb_delete
  - kb_check
  - kb_review_firm_edit
  - kb_prepare_impact_review
  - kb_author_impact_review
  - kb_plan_bootstrap
  - kb_compile_intent
  - kb_apply_plan
tags:
  - tool-surface
  - levels
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-26T10:32:53.215Z'
id: FACT-mcp-remember-full-profile-every-tool
type: fact
---
Scenario input: a session at level remember whose full profile still lists all 18 tools but kb_ingest_proof, planning and coverage tools included, on a knowledge base that has entities and no impact policy.