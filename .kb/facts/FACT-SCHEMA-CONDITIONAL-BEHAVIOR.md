---
title: Conditional behavior predicate schema
status: active
tags:
  - ontology
  - zcode
  - conditional-behavior
fact_kind: predicate_schema
predicate_name: conditional_behavior
predicate_namespace: kibi_zcode
predicate_arity: 3
argument_names:
  - subject
  - condition
  - behavior
argument_types:
  - component
  - condition
  - behavior
argument_descriptions:
  - The component whose behavior is constrained.
  - The runtime or configuration condition under which the behavior applies.
  - The required observable behavior under that condition.
aliases:
  - conditional behavior
  - behavior when enabled
examples:
  - conditional_behavior(kibi_zcode_adapter,installed_and_enabled,emit_advisory_reminders_only)
id: FACT-SCHEMA-CONDITIONAL-BEHAVIOR
type: fact
---
Defines the project-local predicate used to model ZCode adapter behavior under explicit activation or workspace conditions.