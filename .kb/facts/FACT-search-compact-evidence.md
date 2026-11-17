---
title: Without fields set to full, kb_search must leave out each result's evidence graph paths and each answer fact's kb_query call
status: active
fact_kind: property_value
subject_key: kibi.search.result_detail
property_key: summary_results_with_graph_paths_or_fact_calls
operator: eq
value_type: int
value_int: 0
claim_text: Without fields set to full, kb_search must leave out each result's evidence graph paths and each answer fact's kb_query call
text_ref: REQ-search-compact-evidence
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-search-compact-evidence
origin:
  kind: agent
  recorded_at: '2026-11-16T15:40:51.285Z'
claim_key: CLAIM-B5881084C6A81878
id: FACT-search-compact-evidence
type: fact
---
Counts results carrying evidence graph paths and answer facts carrying a kb_query call in a kb_search response without fields full; zero means both wait for fields full.