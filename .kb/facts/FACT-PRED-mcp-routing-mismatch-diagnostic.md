---
title: 'Predicate: conditional_behavior(kibi_mcp_server,requested_workspace_unavailable,answer_from_attached_workspace_with_workspace_mismatch_diagnostic)'
status: active
fact_kind: predicate
predicate_name: conditional_behavior
predicate_args:
  - kibi_mcp_server
  - requested_workspace_unavailable
  - answer_from_attached_workspace_with_workspace_mismatch_diagnostic
canonical_key: conditional_behavior(kibi_mcp_server,requested_workspace_unavailable,answer_from_attached_workspace_with_workspace_mismatch_diagnostic)
polarity: assert
claim_key: CLAIM-0820764EE8F52C4D
claim_text: When the Kibi MCP server cannot answer a call from the requested workspace, it must answer from the attached workspace and add a workspace_mismatch diagnostic to the result
tags:
  - lane:ontology
  - predicate:conditional-behavior
  - mcp
  - worktree
  - routing
id: FACT-PRED-mcp-routing-mismatch-diagnostic
type: fact
---
