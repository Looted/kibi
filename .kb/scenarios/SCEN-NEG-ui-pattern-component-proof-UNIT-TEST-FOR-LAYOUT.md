---
title: A unit test does not prove a scenario grounded in more than UI pattern predicates
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:10:41.163Z'
id: SCEN-NEG-ui-pattern-component-proof-UNIT-TEST-FOR-LAYOUT
type: scenario
---
Given a requirement grounded in ui_pattern and same_pattern whose scenario is verified only by a passing unit test, when the requirement also grounds a ui_container layout predicate, then the unit test no longer counts as proof, the scenario accepts only end-to-end tests, and the requirement gets the missing_passing_e2e gap.

This is the failure side of component-scope proof: only scenarios grounded purely in UI pattern predicates may be proven by component tests. packages/core/tests/kb.plt test requirement_proof_accepts_component_scope_only_for_ui_pattern_scenarios in the ui_pattern_component_proof suite exercises it.
