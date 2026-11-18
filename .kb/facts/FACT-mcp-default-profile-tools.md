---
title: The core tool profile lists exactly the eight core tools
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
claim_text: The core tool profile, chosen by KIBI_MCP_TOOLS, kibi-mcp --tools or the project's mcpTools setting, must list only kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status, kb_skills and kb_review_firm_edit, and also kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity
claim_key: CLAIM-D4F4BDAAF64421B5
value_set:
  - kb_search
  - kb_query
  - kb_record
  - kb_upsert
  - kb_check
  - kb_status
  - kb_skills
  - kb_review_firm_edit
id: FACT-mcp-default-profile-tools
type: fact
---
The core profile lists exactly kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status, kb_skills and kb_review_firm_edit. Kibi proves this set against DEFAULT_PROFILE_TOOLS with an exhaustive certificate. Grounds REQ-mcp-default-tool-profile.