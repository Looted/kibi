---
title: 'Predicate: conditional_behavior(kibi_mcp_server,before_dispatching_tool_call,strip_workspace_root_argument)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_mcp_server
  - before_dispatching_tool_call
  - strip_workspace_root_argument
canonical_key: conditional_behavior(kibi_mcp_server,before_dispatching_tool_call,strip_workspace_root_argument)
polarity: assert
claim_key: CLAIM-55A4848586289BB2
claim_text: The Kibi MCP server must strip the workspaceRoot argument before dispatching a tool call
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - mcp
  - worktree
  - routing
id: FACT-PRED-mcp-routing-strip-argument
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
