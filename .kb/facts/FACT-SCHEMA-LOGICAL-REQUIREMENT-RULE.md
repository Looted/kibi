---
id: FACT-SCHEMA-LOGICAL-REQUIREMENT-RULE
title: Logical requirement rule predicate schema
status: active
created_at: 2026-08-04T00:00:00Z
updated_at: 2026-08-04T00:00:00Z
source: documentation/facts/FACT-SCHEMA-LOGICAL-REQUIREMENT-RULE.md
tags: [lane:ontology, predicate-schema, requirements, prolog]
fact_kind: predicate_schema
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_arity: 3
argument_names: [subject, obligation, outcome]
argument_types: [entity_kind, constraint, logical_result]
argument_descriptions:
  - Domain subject governed by the rule.
  - Canonical obligation or conflicting condition.
  - Required logical representation or validation outcome.
examples:
  - logical_requirement_rule(normative_requirement,every_atomic_clause,keyed_ground_fact)
---

Defines the stable project ontology used to ground Kibi's logical-coverage requirement without turning graph relationship names into ontology predicates.
