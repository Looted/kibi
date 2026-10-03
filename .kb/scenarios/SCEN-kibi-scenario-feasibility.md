---
title: A success scenario assuming a value a current requirement forbids is infeasible unless an approved exception exempts it
status: active
priority: must
tags:
  - scenarios
  - checks
  - requirement-proof
  - scenario-feasibility
id: SCEN-kibi-scenario-feasibility
type: scenario
---
# A success scenario assuming a value a current requirement forbids is infeasible unless an approved exception exempts it

Given a current requirement that requires `client.call_quota.remaining > 0`
And a scenario with `expects: success` that `assumes` a property_value fact `client.call_quota.remaining = 0`
When kb_check runs
Then the canonical rule scenario-feasibility reports the scenario, the requirement and both facts
And every requirement the scenario specifies gets the infeasible_scenario proof gap.

Given an approved exception requirement that exempts the base requirement and is specified_by the scenario
When kb_check runs
Then the scenario is feasible and the base requirement stays current and unchanged.

Given the same assumption on a scenario that expects rejection or error
When kb_check runs
Then the scenario is not checked.
