---
title: 'Predicate: conditional_behavior(kibi_mcp_server,tool_call_carries_workspace_root,answer_from_workspace_owning_that_directory)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_mcp_server
  - tool_call_carries_workspace_root
  - answer_from_workspace_owning_that_directory
canonical_key: conditional_behavior(kibi_mcp_server,tool_call_carries_workspace_root,answer_from_workspace_owning_that_directory)
polarity: assert
claim_key: CLAIM-C9164B1BE4E1435D
claim_text: When a Kibi MCP tool call carries a workspaceRoot argument, the Kibi MCP server must answer the call from the Kibi workspace that owns that directory
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - mcp
  - worktree
  - routing
id: FACT-PRED-mcp-routing-explicit-argument
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
