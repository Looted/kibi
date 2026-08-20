---
title: Relationship provenance policy schema
status: active
tags:
  - ontology
  - strict-semantics
fact_kind: predicate_schema
predicate_name: relationship_provenance_policy
predicate_namespace: kibi.domain
predicate_arity: 3
argument_names:
  - storage
  - record_kind
  - provenance_field
argument_types:
  - storage
  - record_kind
  - field
argument_descriptions:
  - Canonical relationship storage.
  - Stored relationship record.
  - Required per-record provenance field.
examples:
  - relationship_provenance_policy(rdf,relationship_triple,timestamp)
id: FACT-SCHEMA-RELATIONSHIP-PROVENANCE-POLICY
type: fact
---
