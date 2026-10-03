---
title: MCP exposes 16 consolidated agent-facing tools with composite parity and env-gated optional tools
status: open
priority: must
tags:
  - mcp
  - tool-surface
  - composite-tools
  - parity
semantic_text: The Kibi MCP server must expose 16 agent-facing tools, with composite kb_skills and kb_model tools returning the routed catalog operation payload plus the selector. kb_upsert with dryRun true must write nothing and report both write effects as skipped in place of kb_validate_upsert. kb_sparql_remote and kb_job_status must register only when KIBI_MCP_OPTIONAL_TOOLS names them.
semantic_clauses:
  - The Kibi MCP server must expose 16 agent-facing tools, with composite kb_skills and kb_model tools returning the routed catalog operation payload plus the selector.
  - kb_upsert with dryRun true must write nothing and report both write effects as skipped in place of kb_validate_upsert.
  - kb_sparql_remote and kb_job_status must register only when KIBI_MCP_OPTIONAL_TOOLS names them.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 49b62f04889e9885102ab667f4b5774acd49d0adf90c65e2132e77b3d362d659
semantic_inventory:
  - claim_key: CLAIM-1E97A3F6EEC68583
    claim_text: The Kibi MCP server must expose 16 agent-facing tools, with composite kb_skills and kb_model tools returning the routed catalog operation payload plus the selector
    role: normative
    span:
      start: 0
      end: 163
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-E585A68D91DF9E33
    claim_text: kb_upsert with dryRun true must write nothing and report both write effects as skipped in place of kb_validate_upsert
    role: normative
    span:
      start: 165
      end: 282
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-EF0B6032CE452044
    claim_text: kb_sparql_remote and kb_job_status must register only when KIBI_MCP_OPTIONAL_TOOLS names them
    role: normative
    span:
      start: 284
      end: 377
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-1E97A3F6EEC68583
  - CLAIM-E585A68D91DF9E33
  - CLAIM-EF0B6032CE452044
id: REQ-kibi-mcp-tool-consolidation
type: req
---
The Kibi MCP server must expose 16 agent-facing tools, with composite kb_skills and kb_model tools returning the routed catalog operation payload plus the selector. kb_upsert with dryRun true must write nothing and report both write effects as skipped in place of kb_validate_upsert. kb_sparql_remote and kb_job_status must register only when KIBI_MCP_OPTIONAL_TOOLS names them.
