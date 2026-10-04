---
title: 'Predicate: not conditional_behavior(routed_kibi_mcp_child,any_tool_call,route_calls_further)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - routed_kibi_mcp_child
  - any_tool_call
  - route_calls_further
canonical_key: conditional_behavior(routed_kibi_mcp_child,any_tool_call,route_calls_further)
polarity: deny
claim_key: CLAIM-2062509417525DE5
claim_text: A routed Kibi MCP child server must not route calls further
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - mcp
  - worktree
  - routing
id: FACT-PRED-mcp-routing-no-chained-routing
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
