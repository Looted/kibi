---
title: A kb_search call names its text with a word kb_search does not declare for query
status: active
fact_kind: property_value
subject_key: kibi.mcp_input_validation
property_key: kb_search_query_aliases
operator: includes
value_type: set
value_set:
  - search
tags:
  - mcp
  - validation
  - search
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-26T11:09:25.354Z'
id: FACT-NEG-kb-search-query-aliases-OTHER-NAME
type: fact
---
Scenario input: a kb_search call that sends its text as search, a name the query field does not declare, and no query.