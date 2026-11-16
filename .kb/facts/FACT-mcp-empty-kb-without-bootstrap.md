---
title: MCP server that hides the bootstrap tools on an empty knowledge base
status: active
fact_kind: property_value
subject_key: kibi.mcp.tool_catalog
property_key: empty_kb_lists_bootstrap_tools
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
id: FACT-mcp-empty-kb-without-bootstrap
type: fact
---
Scenario input: a default-profile session on a repository with no knowledge base entities that lists neither kb_plan_bootstrap nor kb_apply_plan.