---
id: FACT-SCHEMA-GENERIC-INFERRED-VALUES-UNREVIEWED
title: Generic inferred values unreviewed predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_name: generic_inferred_values_unreviewed
predicate_arity: 1
argument_names:
  - candidate
argument_types:
  - candidate_kind
argument_descriptions:
  - Kind of suggestion candidate whose binding is a generic placeholder value.
examples:
  - "generic_inferred_values_unreviewed(placeholder_bound_candidate)"
type: fact
---

Grounds suggestion candidates whose supplied binding is a generic placeholder rather than a reviewed value.
