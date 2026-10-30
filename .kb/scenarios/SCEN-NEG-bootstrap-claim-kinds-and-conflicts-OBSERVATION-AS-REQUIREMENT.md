---
title: Observation and open-question claims are never planned as requirements
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:34.117Z'
id: SCEN-NEG-bootstrap-claim-kinds-and-conflicts-OBSERVATION-AS-REQUIREMENT
type: scenario
---
Given declared intent claims of kind observation and open question next to one normative claim, when the bootstrap planner builds the plan, then only the normative claim becomes a requirement and the other two are planned as cited observation facts, the open question tagged review:open-question.

This is the failure side of claim kinds: a statement that was declared as an observation must not be promoted into a requirement. packages/cli/tests/operations/bootstrap-intent-claims.test.ts "observations and open questions become cited observation facts, never requirements" exercises it.
