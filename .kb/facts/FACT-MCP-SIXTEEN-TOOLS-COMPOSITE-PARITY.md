---
title: MCP exposes 16 tools; composite results equal the routed payload plus selector
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.mcp.tool_schema
  - sixteen_agent_facing_tools
  - composite_result_equals_routed_payload_plus_selector
canonical_key: logical_requirement_rule(kibi.mcp.tool_schema,sixteen_agent_facing_tools,composite_result_equals_routed_payload_plus_selector)
polarity: assert
claim_key: CLAIM-1E97A3F6EEC68583
claim_text: The Kibi MCP server must expose 16 agent-facing tools, with composite kb_skills and kb_model tools returning the routed catalog operation payload plus the selector
text_ref: .kb/requirements/REQ-kibi-mcp-tool-consolidation.md
tags:
  - lane:ontology
  - parity
id: FACT-MCP-SIXTEEN-TOOLS-COMPOSITE-PARITY
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
