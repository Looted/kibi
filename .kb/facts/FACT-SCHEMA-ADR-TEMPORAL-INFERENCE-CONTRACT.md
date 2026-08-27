---
title: ADR temporal inference contract schema
status: active
tags:
  - lane:ontology
  - predicate-schema
  - adr
  - temporal
  - inference
  - validation
fact_kind: predicate_schema
predicate_name: adr_temporal_inference_contract
predicate_namespace: kibi.adr
predicate_arity: 4
argument_names:
  - current_resolver
  - chain_resolver
  - supersession_resolver
  - missing_successor_policy
argument_types:
  - predicate_surface
  - predicate_surface
  - predicate_surface
  - validation_policy
argument_descriptions:
  - Predicate surface resolving the currently effective ADR.
  - Predicate surface traversing the ADR decision chain.
  - Predicate surface resolving supersession successors.
  - Check behavior for superseded or deprecated ADRs without a successor.
examples:
  - adr_temporal_inference_contract(current_adr_1,adr_chain_2,superseded_by_2,flag_superseded_or_deprecated_adr_without_successor)
id: FACT-SCHEMA-ADR-TEMPORAL-INFERENCE-CONTRACT
type: fact
---
