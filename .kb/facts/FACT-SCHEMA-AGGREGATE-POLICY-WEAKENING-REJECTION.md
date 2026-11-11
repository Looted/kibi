---
id: FACT-SCHEMA-AGGREGATE-POLICY-WEAKENING-REJECTION
title: Aggregate policy weakening rejection predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_name: aggregate_policy_weakening_rejection
predicate_arity: 3
argument_names:
  - policy
  - candidate
  - trusted_policy
argument_types:
  - enforcement_surface
  - policy_scope
  - policy_scope
argument_descriptions:
  - Policy surface that runs the aggregate gate.
  - Policy carried by the candidate change.
  - Policy on the protected target that the change is judged by.
examples:
  - "aggregate_policy_weakening_rejection(kibi.impact_policy,candidate_policy,trusted_target_policy)"
type: fact
---

Grounds how the aggregate pull request gate treats a candidate that changes the impact policy.
