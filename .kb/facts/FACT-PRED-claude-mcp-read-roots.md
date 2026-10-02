---
title: 'Predicate: conditional_behavior(kibi_claude_mcp_launcher,client_supports_mcp_roots,read_client_roots_before_each_tool_call)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_claude_mcp_launcher
  - client_supports_mcp_roots
  - read_client_roots_before_each_tool_call
canonical_key: conditional_behavior(kibi_claude_mcp_launcher,client_supports_mcp_roots,read_client_roots_before_each_tool_call)
polarity: assert
claim_key: CLAIM-00B35D3005D46EDD
claim_text: When the MCP client supports roots, the kibi-claude MCP launcher must read the client roots before each tool call
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - claude
  - mcp
  - worktree
id: FACT-PRED-claude-mcp-read-roots
type: fact
---
