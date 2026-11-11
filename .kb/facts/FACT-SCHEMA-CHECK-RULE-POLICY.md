---
id: FACT-SCHEMA-CHECK-RULE-POLICY
title: Check rule policy predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.check
predicate_name: check_rule_policy
predicate_arity: 3
argument_names:
  - finding
  - condition
  - reporting
argument_types:
  - check_finding
  - finding_condition
  - reporting_surface
argument_descriptions:
  - Finding the rule produces.
  - Condition the rule detects.
  - Where the finding is reported.
examples:
  - "check_rule_policy(scenario_outcome_mismatch,rejection_scenario_whose_assumptions_requirements_permit,reported_by_kibi_check)"
type: fact
---

Grounds what kibi check must report for a detected KB condition.
