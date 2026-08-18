---
title: First-class relationship type policy schema
status: active
tags:
  - ontology
  - strict-semantics
fact_kind: predicate_schema
predicate_name: relationship_type_policy
predicate_namespace: kibi.domain
predicate_arity: 2
argument_names:
  - model
  - relationship_types
argument_types:
  - model
  - relationship_type_set
argument_descriptions:
  - Canonical relationship model.
  - Named first-class relationship types.
examples:
  - relationship_type_policy(kibi_relationship_model,implements__validates__specified_by__covered_by__depends_on__relates_to__constrained_by)
id: FACT-SCHEMA-RELATIONSHIP-TYPE-POLICY
type: fact
---
