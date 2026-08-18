---
title: Source discovery failure policy schema
status: active
tags:
  - ontology
  - relationship-parity
fact_kind: predicate_schema
predicate_name: source_discovery_failure_policy
predicate_namespace: kibi.validation
predicate_arity: 2
argument_names:
  - rule
  - outcome
argument_types:
  - rule
  - outcome
argument_descriptions:
  - Named source-owning check rule.
  - Required outcome when source discovery is incomplete.
examples:
  - source_discovery_failure_policy(source_relationship_parity,blocking)
id: FACT-SCHEMA-SOURCE-DISCOVERY-FAILURE-POLICY
type: fact
---
