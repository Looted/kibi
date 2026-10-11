---
title: A discovery result sent to a host that shows structuredContent carries the text summary alone
status: active
tags:
  - lane:ontology
  - mcp
  - search-lane
text_ref: .kb/requirements/REQ-mcp-structured-text-per-host.md
fact_kind: predicate
polarity: assert
canonical_key: logical_requirement_rule(kibi.mcp.tool_schema,discovery_result_sent_to_host_showing_structured_content,text_summary_without_data_copy)
claim_key: CLAIM-D65CD1D40555402F
claim_text: A discovery tool result sent to a host that shows structuredContent must carry the text summary alone without a copy of the data JSON
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.mcp.tool_schema
  - discovery_result_sent_to_host_showing_structured_content
  - text_summary_without_data_copy
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-11T20:32:01.106Z'
id: FACT-MCP-STRUCTURED-TEXT-OMITTED
type: fact
---
When the MCP server answers a discovery tool (`kb_query`, `kb_search`, `kb_status`, `kb_prepare_impact_review`) for a host that shows `structuredContent` to the agent (Claude Code, identified by `KIBI_MCP_HOST=claude-code` or by the client name sent on initialize), the text part is the human-readable summary alone; the `data` JSON is not repeated in it.

## Context

Search-lane round 1 (G5/G15): every kb_search answer measured on the test project was about twice its payload because the text part carried `JSON.stringify(data)` ahead of the summary. Asked by the project owner through the search-lane fix PRs (fix 6).