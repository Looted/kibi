---
title: MCP public surface policy schema
status: active
tags:
  - ontology
  - strict-semantics
fact_kind: predicate_schema
predicate_name: mcp_public_surface_policy
predicate_namespace: kibi.domain
predicate_arity: 3
argument_names:
  - surface
  - curation
  - determinism
argument_types:
  - surface
  - policy
  - policy
argument_descriptions:
  - Public operation surface.
  - Whether exposure is curated.
  - Whether results and ordering are deterministic.
examples:
  - mcp_public_surface_policy(kibi_mcp,curated,deterministic)
id: FACT-SCHEMA-MCP-PUBLIC-SURFACE-POLICY
type: fact
---
