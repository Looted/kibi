---
title: A summary search response carries every graph path and fact call
status: active
fact_kind: property_value
subject_key: kibi.search.result_detail
property_key: summary_results_with_graph_paths_or_fact_calls
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T15:40:54.685Z'
id: FACT-NEG-search-compact-evidence-VERBOSE
type: fact
---
A kb_search call without fields full returns each result's graph paths and each fact's kb_query call, spending the agent's context on structure before it has read the statement or the reason.