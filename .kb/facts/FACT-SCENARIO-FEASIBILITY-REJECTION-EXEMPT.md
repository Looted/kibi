---
title: Scenarios expecting rejection or error are not feasibility-checked
status: active
fact_kind: predicate
predicate_namespace: kibi.checks
predicate_name: check_exemption_policy
predicate_args:
  - scenario_feasibility
  - rejection_or_error_expectation
canonical_key: check_exemption_policy(scenario_feasibility,rejection_or_error_expectation)
polarity: assert
claim_key: CLAIM-90669BB32C299C4E
claim_text: The scenario-feasibility check must not check scenarios that expect rejection or error
text_ref: .kb/requirements/REQ-kibi-scenario-feasibility.md
tags:
  - lane:ontology
  - scenario-feasibility
id: FACT-SCENARIO-FEASIBILITY-REJECTION-EXEMPT
type: fact
---
