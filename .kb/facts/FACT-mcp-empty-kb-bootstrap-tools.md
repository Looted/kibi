---
title: The core tool profile also lists kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity
status: active
fact_kind: property_value
subject_key: kibi.mcp.tool_catalog
property_key: empty_kb_bootstrap_tools
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
  - kb_plan_bootstrap
  - kb_apply_plan
id: FACT-mcp-empty-kb-bootstrap-tools
type: fact
---
While the knowledge base holds no entity, the core profile adds exactly kb_plan_bootstrap and kb_apply_plan. Kibi proves this set against BOOTSTRAP_TOOLS with an exhaustive certificate. Grounds REQ-mcp-default-tool-profile.