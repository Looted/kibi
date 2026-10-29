---
title: A trigger binding outside the closed vocabulary is refused and the allowed constants are listed
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:02.252Z'
id: SCEN-NEG-model-predicates-closed-vocabularies-OFF-VOCABULARY
type: scenario
---
Given the claim "The editor must save the draft when the user teleports." and the commit_action schema, when an agent binds trigger to "teleport", then the binding is refused: the candidate stays incomplete with trigger unbound, no apply plan is returned, and the trigger hint lists the allowed constants escape, cancel, submit, navigation, click and timeout with the reason the value was refused.

This is the failure side of closed predicate vocabularies: a value outside the declared constants must not complete a plan, and the agent is told which values it may use. packages/cli/tests/operations/predicate-binding-placeholders.test.ts "an explicit binding outside the closed vocabulary is refused with the allowed values" exercises it.
