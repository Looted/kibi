---
id: FACT-SCHEMA-ADVISOR-POLICY
title: Semantic advisor policy predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.modeling
predicate_name: advisor_policy
predicate_arity: 3
argument_names:
  - input
  - output_field
  - behavior
argument_types:
  - advisor_input
  - advisor_output
  - advisor_behavior
argument_descriptions:
  - Clause or suggestion the advisor receives.
  - Field of the advisor receipt.
  - What the field must contain.
examples:
  - "advisor_policy(strict_property_suggestion,cases_preview,lists_derived_edge_cases)"
type: fact
---

Grounds what the semantic advisor must report for a kind of clause or suggestion.
