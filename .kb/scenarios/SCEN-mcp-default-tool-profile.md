---
title: A session lists every tool unless the core profile is chosen, and the core profile lists eight plus bootstrap on an empty knowledge base
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
tags:
  - tool-surface
id: SCEN-mcp-default-tool-profile
type: scenario
---
Given a Kibi workspace, when the MCP server starts without a profile choice, then it lists every MCP tool. When KIBI_MCP_TOOLS=core, kibi-mcp --tools core or the project's mcpTools setting chooses the core profile, it lists kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status, kb_skills and kb_review_firm_edit, adds kb_plan_bootstrap and kb_apply_plan while the knowledge base has no entity, and its initialize instructions name the other tools and their CLI route.