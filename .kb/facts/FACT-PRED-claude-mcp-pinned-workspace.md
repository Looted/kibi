---
title: 'Predicate: not conditional_behavior(kibi_claude_mcp_launcher,kibi_workspace_env_set,follow_client_roots)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_claude_mcp_launcher
  - kibi_workspace_env_set
  - follow_client_roots
canonical_key: conditional_behavior(kibi_claude_mcp_launcher,kibi_workspace_env_set,follow_client_roots)
polarity: deny
claim_key: CLAIM-B8C0003B285310DE
claim_text: When a Kibi workspace environment variable is set, the kibi-claude MCP launcher must not follow the client roots
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - claude
  - mcp
  - worktree
id: FACT-PRED-claude-mcp-pinned-workspace
type: fact
---
