---
title: kb_search accepts question in place of query when the input has no query
status: active
fact_kind: property_value
subject_key: kibi.mcp_input_validation
property_key: kb_search_query_aliases
operator: eq
value_type: set
value_set:
  - question
claim_text: kb_search must accept question in place of query on MCP and on the CLI JSON route when the input has no query
text_ref: packages/cli/src/public/operations/specs/discovery.ts
tags:
  - mcp
  - validation
  - search
origin:
  kind: agent
  recorded_at: '2026-11-26T11:04:07.324Z'
claim_key: CLAIM-BE650ABBB3E59D62
id: FACT-kb-search-query-aliases
type: fact
---
The kb_search query field declares question as its only other accepted name, through the x-kibi-input-aliases marker that the CLI JSON route and the MCP server both apply before validating the input.