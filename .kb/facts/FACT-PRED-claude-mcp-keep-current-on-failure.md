---
title: 'Predicate: conditional_behavior(kibi_claude_mcp_launcher,roots_query_or_server_start_fails,keep_answering_from_current_workspace)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_claude_mcp_launcher
  - roots_query_or_server_start_fails
  - keep_answering_from_current_workspace
canonical_key: conditional_behavior(kibi_claude_mcp_launcher,roots_query_or_server_start_fails,keep_answering_from_current_workspace)
polarity: assert
claim_key: CLAIM-7340EAFAA796212F
claim_text: When the roots query fails or the new workspace server cannot start, the kibi-claude MCP launcher must keep answering from the current workspace
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - claude
  - mcp
  - worktree
id: FACT-PRED-claude-mcp-keep-current-on-failure
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
