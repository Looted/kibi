---
title: A success scenario assuming a forbidden value is a blocking violation
status: active
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.checks.core_rules
  - success_scenario_assumes_forbidden_value
  - blocking_violation
canonical_key: logical_requirement_rule(kibi.checks.core_rules,success_scenario_assumes_forbidden_value,blocking_violation)
polarity: assert
claim_key: CLAIM-2280D0882FBA7640
claim_text: The scenario-feasibility check must report a scenario that expects success and assumes a property value that a current requirement forbids
text_ref: .kb/requirements/REQ-kibi-scenario-feasibility.md
tags:
  - lane:ontology
  - scenario-feasibility
id: FACT-SCENARIO-FEASIBILITY-FORBIDDEN-ASSUMPTION
type: fact
---
