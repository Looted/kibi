---
title: kibi check reports a rejection scenario whose assumptions the requirements permit
status: active
fact_kind: predicate
predicate_name: check_rule_policy
predicate_args:
  - scenario_outcome_mismatch
  - rejection_scenario_whose_assumptions_requirements_permit
  - reported_by_kibi_check
polarity: assert
canonical_key: check_rule_policy(scenario_outcome_mismatch,rejection_scenario_whose_assumptions_requirements_permit,reported_by_kibi_check)
claim_key: CLAIM-776228FDA6AAB43E
claim_text: The Kibi check must report a scenario that expects rejection or error while current requirements permit everything it assumes
text_ref: .kb/requirements/REQ-kibi-happy-path-gap.md
origin:
  kind: agent
  recorded_at: '2026-10-29T22:30:00.000Z'
id: FACT-PRED-kibi-happy-path-gap-outcome-mismatch
type: fact
---
kibi check reports a rejection scenario whose assumptions the requirements permit. This predicate grounds the claim of REQ-kibi-happy-path-gap quoted in claim_text, so the requirement's semantic inventory counts it as modeled.