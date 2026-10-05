---
title: 'Predicate: conditional_behavior(kibi_claude_mcp_launcher,client_roots_name_other_kibi_workspace,answer_tool_call_from_that_workspace)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_claude_mcp_launcher
  - client_roots_name_other_kibi_workspace
  - answer_tool_call_from_that_workspace
canonical_key: conditional_behavior(kibi_claude_mcp_launcher,client_roots_name_other_kibi_workspace,answer_tool_call_from_that_workspace)
polarity: assert
claim_key: CLAIM-30D2679B0BBA42EB
claim_text: When the client roots name a different Kibi workspace, the kibi-claude MCP launcher must answer the tool call from that workspace
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - claude
  - mcp
  - worktree
id: FACT-PRED-claude-mcp-answer-from-roots
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
