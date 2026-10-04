---
title: An only-when rule blocks a success scenario that violates it, inside its scope and validity window, unless an exception waives that clause
status: active
priority: must
tags:
  - scenarios
  - scenario-feasibility
  - conditional
  - rules
  - validity
  - exceptions
origin:
  kind: agent
  recorded_at: '2026-10-04T02:28:03.381Z'
id: SCEN-kibi-conditional-feasibility
type: scenario
---
# An only-when rule blocks a success scenario that violates it, inside its scope and validity window, unless an exception waives that clause

Given a current requirement "checkout may happen only when the cart total is positive" compiled to a `forbid` rule linked through `requires_rule`
And a checkout scenario that expects success and assumes a zero cart total
When `kb_check` runs
Then `scenario-feasibility` reports the scenario and the proof ladder blocks the requirements it specifies.

Given the scenario assumes a value only outside the requirement's scope, or at a time outside the validity window of the requirement's grounding fact
When `kb_check` runs
Then the scenario's feasibility outcome is `not_applicable`.

Given an approved exception requirement that exempts the requirement, is specified by the scenario and lists `exempts_claims`
When `kb_check` runs
Then only the constraints grounded by facts carrying those claim keys are waived
And an `exempts_claims` key that is not a claim of an exempted requirement is reported by `exception-claim-keys`.
