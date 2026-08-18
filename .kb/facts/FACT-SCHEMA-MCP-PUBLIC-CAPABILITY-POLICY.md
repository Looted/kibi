---
title: MCP public capability policy schema
status: active
tags:
  - ontology
  - strict-semantics
fact_kind: predicate_schema
predicate_name: mcp_public_capability_policy
predicate_namespace: kibi.domain
predicate_arity: 5
argument_names:
  - surface
  - exact_retrieval
  - discovery_reporting
  - mutation
  - validation
argument_types:
  - surface
  - operation_set
  - operation_set
  - operation_set
  - operation_set
argument_descriptions:
  - Public operation surface.
  - Exact retrieval operations.
  - Curated discovery and reporting operations.
  - Mutation operations.
  - Validation operations.
examples:
  - mcp_public_capability_policy(kibi_mcp,kb_query,kb_search__kb_status__kb_find_gaps__kb_coverage__kb_graph,kb_upsert__kb_delete,kb_check)
id: FACT-SCHEMA-MCP-PUBLIC-CAPABILITY-POLICY
type: fact
---
