---
title: 'Predicate: conditional_behavior(kibi_mcp_server,no_workspace_root_and_client_declares_roots,answer_from_workspace_named_by_roots)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_mcp_server
  - no_workspace_root_and_client_declares_roots
  - answer_from_workspace_named_by_roots
canonical_key: conditional_behavior(kibi_mcp_server,no_workspace_root_and_client_declares_roots,answer_from_workspace_named_by_roots)
polarity: assert
claim_key: CLAIM-5B147F886790864A
claim_text: When a Kibi MCP tool call without a workspaceRoot argument arrives from a client that declares MCP roots, the Kibi MCP server must answer the call from the Kibi workspace named by the client roots
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - mcp
  - worktree
  - routing
id: FACT-PRED-mcp-routing-client-roots
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
