---
title: kb_sparql_remote and kb_job_status register only when KIBI_MCP_OPTIONAL_TOOLS names them
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.mcp.tool_schema
  - optional_sparql_remote_and_job_status_tools
  - registered_only_when_named_in_env
canonical_key: logical_requirement_rule(kibi.mcp.tool_schema,optional_sparql_remote_and_job_status_tools,registered_only_when_named_in_env)
polarity: assert
claim_key: CLAIM-EF0B6032CE452044
claim_text: kb_sparql_remote and kb_job_status must register only when KIBI_MCP_OPTIONAL_TOOLS names them
text_ref: .kb/requirements/REQ-kibi-mcp-tool-consolidation.md
tags:
  - lane:ontology
  - parity
id: FACT-MCP-OPTIONAL-TOOLS-ENV-GATED
type: fact
---
