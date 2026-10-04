---
title: Relationship policy
status: active
fact_kind: predicate_schema
predicate_name: relationship_policy
predicate_namespace: kibi.relationships
predicate_arity: 3
argument_names:
  - relationship
  - aspect
  - value
argument_types:
  - relationship_type
  - policy_aspect
  - policy_value
argument_descriptions:
  - Typed relationship.
  - Aspect of the relationship being constrained (endpoints, currency, ...).
  - Required value for that aspect.
examples:
  - relationship_policy(restates,endpoints,requirement_to_requirement)
tags:
  - ontology
  - vocabulary-convergence
id: FACT-SCHEMA-RELATIONSHIP-POLICY
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
