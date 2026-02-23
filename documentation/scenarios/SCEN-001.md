---
id: SCEN-001
title: Agent queries requirements from KB via MCP kb_query tool
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - mcp
  - query
links:
  - REQ-002
---

Steps:
1. LLM agent sends `tools/call` with `name: kb_query`, `arguments: { type: "req" }`
2. MCP server queries Prolog KB with `kb_entity(Id, req, Props)`
3. Server serialises results to JSON array and returns in `content[0].text`
4. Agent receives list of requirement objects with `id`, `title`, `status`, `tags`
