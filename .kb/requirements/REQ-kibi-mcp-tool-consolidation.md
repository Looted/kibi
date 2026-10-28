---
title: MCP exposes 16 consolidated agent-facing tools with composite parity and env-gated optional tools
status: open
priority: must
tags:
  - mcp
  - tool-surface
  - composite-tools
  - parity
  - review:context-missing
semantic_text: The composite kb_skills and kb_model MCP tools must return the routed catalog operation payload plus the selector. kb_upsert with dryRun true must write nothing and report both write effects as skipped in place of kb_validate_upsert. kb_sparql_remote and kb_job_status must register only when KIBI_MCP_OPTIONAL_TOOLS names them.
semantic_clauses:
  - The composite kb_skills and kb_model MCP tools must return the routed catalog operation payload plus the selector.
  - kb_upsert with dryRun true must write nothing and report both write effects as skipped in place of kb_validate_upsert.
  - kb_sparql_remote and kb_job_status must register only when KIBI_MCP_OPTIONAL_TOOLS names them.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d4acf4b84a3659c4487702aacf23ec25bd9e75d153af9a0e1010d59b9a76ff37
semantic_inventory:
  - claim_key: CLAIM-0F3A7EBB47647E43
    claim_text: The composite kb_skills and kb_model MCP tools must return the routed catalog operation payload plus the selector
    role: normative
    status: modeled
    span:
      start: 0
      end: 113
  - claim_key: CLAIM-E585A68D91DF9E33
    claim_text: kb_upsert with dryRun true must write nothing and report both write effects as skipped in place of kb_validate_upsert
    role: normative
    status: modeled
    span:
      start: 115
      end: 232
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-EF0B6032CE452044
    claim_text: kb_sparql_remote and kb_job_status must register only when KIBI_MCP_OPTIONAL_TOOLS names them
    role: normative
    status: modeled
    span:
      start: 234
      end: 327
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-0F3A7EBB47647E43
  - CLAIM-E585A68D91DF9E33
  - CLAIM-EF0B6032CE452044
id: REQ-kibi-mcp-tool-consolidation
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-28T09:29:20.974Z'
---
The composite kb_skills and kb_model MCP tools must return the routed catalog operation payload plus the selector. kb_upsert with dryRun true must write nothing and report both write effects as skipped in place of kb_validate_upsert. kb_sparql_remote and kb_job_status must register only when KIBI_MCP_OPTIONAL_TOOLS names them.
