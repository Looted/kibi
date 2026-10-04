---
title: 'Predicate: conditional_behavior(non_claude_host_mcp_launcher,client_supports_mcp_roots,answer_tool_call_from_roots_workspace)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - non_claude_host_mcp_launcher
  - client_supports_mcp_roots
  - answer_tool_call_from_roots_workspace
canonical_key: conditional_behavior(non_claude_host_mcp_launcher,client_supports_mcp_roots,answer_tool_call_from_roots_workspace)
polarity: assert
claim_key: CLAIM-E0C57CF2EAAD51EA
claim_text: When the MCP client supports roots, each non-Claude host MCP launcher must answer each tool call from the Kibi workspace that the client roots name
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - mcp
  - worktree
id: FACT-PRED-mcp-launchers-follow-roots
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
