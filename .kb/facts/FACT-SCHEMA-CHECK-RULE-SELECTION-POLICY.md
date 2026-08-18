---
title: Check rule selection policy schema
status: active
tags:
  - ontology
  - relationship-parity
fact_kind: predicate_schema
predicate_name: check_rule_selection_policy
predicate_namespace: kibi.validation
predicate_arity: 2
argument_names:
  - rule
  - selection_mode
argument_types:
  - rule
  - selection_mode
argument_descriptions:
  - Named check rule.
  - How explicit rule selection is handled.
examples:
  - check_rule_selection_policy(source_relationship_parity,honor_explicit_selection)
id: FACT-SCHEMA-CHECK-RULE-SELECTION-POLICY
type: fact
---
