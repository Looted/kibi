---
title: Exact curated MCP public capabilities
status: active
text_ref: documentation/requirements/REQ-002.md
tags:
  - lane:ontology
  - strict-semantics
fact_kind: predicate
polarity: assert
predicate_namespace: kibi.domain
predicate_name: mcp_public_capability_policy
predicate_args:
  - kibi_mcp
  - kb_query
  - kb_search__kb_status__kb_find_gaps__kb_coverage__kb_graph
  - kb_upsert__kb_delete
  - kb_check
canonical_key: mcp_public_capability_policy(kibi_mcp,kb_query,kb_search__kb_status__kb_find_gaps__kb_coverage__kb_graph,kb_upsert__kb_delete,kb_check)
claim_key: CLAIM-AF3924185E8D9C99
claim_text: It includes exact retrieval (`kb_query`), discovery/reporting (`kb_search`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`), mutation (`kb_upsert`, `kb_delete`), and validation (`kb_check`)
id: FACT-MCP-PUBLIC-CAPABILITY-POLICY
type: fact
---
It includes exact retrieval (`kb_query`), discovery/reporting (`kb_search`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`), mutation (`kb_upsert`, `kb_delete`), and validation (`kb_check`).

