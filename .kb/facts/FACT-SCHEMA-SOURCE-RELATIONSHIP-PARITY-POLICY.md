---
title: Source relationship parity policy schema
status: active
tags:
  - ontology
  - relationship-parity
fact_kind: predicate_schema
predicate_name: source_relationship_parity_policy
predicate_namespace: kibi.validation
predicate_arity: 4
argument_names:
  - source_class
  - direction
  - coverage
  - outcome
argument_types:
  - source_class
  - direction
  - coverage
  - outcome
argument_descriptions:
  - Relationship source ownership class.
  - Parity comparison direction.
  - Sources or edges covered.
  - Required check outcome.
examples:
  - source_relationship_parity_policy(authored_sources,authored_to_compiled,tracked_markdown__symbol_manifests__relationship_shards,blocking)
id: FACT-SCHEMA-SOURCE-RELATIONSHIP-PARITY-POLICY
type: fact
---
