---
title: Entity field policy schema
status: active
tags:
  - ontology
  - strict-semantics
fact_kind: predicate_schema
predicate_name: entity_field_policy
predicate_namespace: kibi.domain
predicate_arity: 3
argument_names:
  - model
  - required_fields
  - optional_fields
argument_types:
  - model
  - field_set
  - field_set
argument_descriptions:
  - Canonical entity model.
  - Fields required on every typed entity.
  - Fields optional on typed entities.
examples:
  - entity_field_policy(kibi_entity_model,id__type__title__status__created_at__updated_at,priority__tags__owner__source__links)
id: FACT-SCHEMA-ENTITY-FIELD-POLICY
type: fact
---
