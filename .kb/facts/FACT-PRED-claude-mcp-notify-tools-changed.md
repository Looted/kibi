---
title: 'Predicate: conditional_behavior(kibi_claude_mcp_launcher,workspace_changed,notify_tool_list_changed)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_claude_mcp_launcher
  - workspace_changed
  - notify_tool_list_changed
canonical_key: conditional_behavior(kibi_claude_mcp_launcher,workspace_changed,notify_tool_list_changed)
polarity: assert
claim_key: CLAIM-ACF117B9E90D97FB
claim_text: When the kibi-claude MCP launcher changes workspace, it must notify the client that the tool list changed
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - claude
  - mcp
  - worktree
id: FACT-PRED-claude-mcp-notify-tools-changed
type: fact
---
