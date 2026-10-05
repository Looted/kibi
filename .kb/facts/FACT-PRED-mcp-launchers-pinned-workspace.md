---
title: 'Predicate: not conditional_behavior(non_claude_host_mcp_launcher,kibi_workspace_env_set,follow_client_roots)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - non_claude_host_mcp_launcher
  - kibi_workspace_env_set
  - follow_client_roots
canonical_key: conditional_behavior(non_claude_host_mcp_launcher,kibi_workspace_env_set,follow_client_roots)
polarity: deny
claim_key: CLAIM-27758364AADBD9A1
claim_text: When a Kibi workspace environment variable is set, each non-Claude host MCP launcher must not follow the client roots
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - mcp
  - worktree
id: FACT-PRED-mcp-launchers-pinned-workspace
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
