---
title: Conditional rules, scopes, validity windows and clause-level exceptions decide scenario feasibility
status: passing
tags:
  - scenarios
  - scenario-feasibility
  - conditional
  - rules
  - validity
  - exceptions
verification_scope: integration
verification_perspective: consumer
text_ref: packages/cli/tests/consumer/conditional-feasibility.test.ts; packages/core/tests/kb.plt
origin:
  kind: agent
  recorded_at: '2026-10-04T02:28:01.288Z'
id: TEST-kibi-conditional-feasibility
type: test
---
# Conditional rules, scopes, validity windows and clause-level exceptions decide scenario feasibility

Runs `packages/cli/tests/consumer/conditional-feasibility.test.ts` through the built `kibi` CLI in a consumer workspace (an only-when requirement compiled from prose with `kb_compile_intent` and applied with `apply-plan` blocks checkout scenarios that assume a zero cart total, a scenario outside an EU-scoped rule is not applicable, undecided assumptions stay `scenario-feasibility-unknown`, and an approved exception listing `exempts_claims` waives only that clause for its scenario) and the `kb_scenario_feasibility` unit block of `packages/core/tests/kb.plt` (`an_only_when_rule_blocks_a_success_scenario_whose_assumptions_violate_it`, `rule_and_property_lanes_give_the_same_feasibility_answers`, `a_rule_with_several_conditions_is_decided_by_entailment_and_refutation`, `an_approved_exception_waives_a_rule_only_for_its_scenario`, `an_exception_to_one_clause_does_not_waive_another`, `exempts_claims_must_name_claims_of_an_exempted_requirement`, `validity_windows_decide_whether_a_constraint_applies`, `a_scoped_requirement_does_not_apply_to_a_disjoint_scope`).
