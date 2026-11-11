---
id: FACT-SCHEMA-IMPACT-POLICY-OPT-IN
title: Impact policy opt-in predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_name: impact_policy_opt_in
predicate_arity: 3
argument_names:
  - policy
  - preserved_behavior
  - enabling_condition
argument_types:
  - enforcement_surface
  - policy_scope
  - policy_scope
argument_descriptions:
  - Policy surface that may be enabled.
  - Project behavior kept while the policy is off.
  - Condition that turns the policy on.
examples:
  - "impact_policy_opt_in(kibi.impact_policy,existing_project_behavior,explicit_policy_opt_in)"
type: fact
---

Grounds when impact review starts to apply to a project.
