---
title: 'Predicate: conditional_behavior(kibi_mcp_server,serving_another_workspace,require_same_repository_worktree_or_client_root_or_allowlist)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_mcp_server
  - serving_another_workspace
  - require_same_repository_worktree_or_client_root_or_allowlist
canonical_key: conditional_behavior(kibi_mcp_server,serving_another_workspace,require_same_repository_worktree_or_client_root_or_allowlist)
polarity: assert
claim_key: CLAIM-827D3DB6400B3DB5
claim_text: The Kibi MCP server must serve another workspace only when it is a worktree of the attached repository, lies under the client roots, or is listed in the routable roots allowlist
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - mcp
  - worktree
  - routing
id: FACT-PRED-mcp-routing-routing-boundary
type: fact
---
