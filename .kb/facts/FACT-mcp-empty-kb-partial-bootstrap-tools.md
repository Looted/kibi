---
title: Core tool profile that hides the bootstrap tools on an empty knowledge base
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
value_set:
  - kb_plan_bootstrap
id: FACT-mcp-empty-kb-partial-bootstrap-tools
type: fact
---
Scenario input: a default-profile session on a repository with no knowledge base entities that adds kb_plan_bootstrap but not kb_apply_plan, so the plan it drafts cannot be applied.