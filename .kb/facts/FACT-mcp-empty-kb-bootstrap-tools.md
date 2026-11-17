---
title: The MCP server must also list kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity
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
claim_text: The MCP server must also list kb_plan_bootstrap and kb_apply_plan while the knowledge base holds no entity
claim_key: CLAIM-756AC6B3EC9E1EC2
value_set:
  - kb_plan_bootstrap
  - kb_apply_plan
id: FACT-mcp-empty-kb-bootstrap-tools
type: fact
---
While the knowledge base holds no entity, the default profile adds exactly kb_plan_bootstrap and kb_apply_plan. Kibi proves this set against BOOTSTRAP_TOOLS with an exhaustive certificate. Grounds REQ-mcp-default-tool-profile.