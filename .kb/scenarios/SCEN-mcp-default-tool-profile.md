---
title: A default session lists seven tools, an empty knowledge base adds the bootstrap tools, and the full profile lists all
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
Given a Kibi workspace, when the MCP server starts without a profile choice, then it lists kb_search, kb_query, kb_record, kb_upsert, kb_check, kb_status and kb_skills, adds kb_plan_bootstrap and kb_apply_plan while the knowledge base has no entity, and its initialize instructions name the other tools and their CLI route; when KIBI_MCP_TOOLS=full, kibi-mcp --tools full or the project's mcpTools setting chooses the full profile, it lists every tool.