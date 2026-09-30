---
title: Unit comparison policy
status: active
fact_kind: predicate_schema
predicate_name: unit_comparison_policy
predicate_namespace: kibi.checks
predicate_arity: 2
argument_names:
  - unit_class
  - comparison
argument_types:
  - unit_class
  - comparison_rule
argument_descriptions:
  - Class of authored unit.
  - How values with that unit are compared or stored.
examples:
  - unit_comparison_policy(known_unit_family,compare_in_base_unit)
tags:
  - ontology
  - vocabulary-convergence
id: FACT-SCHEMA-UNIT-COMPARISON-POLICY
type: fact
---
