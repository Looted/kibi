---
title: A claim the requirement does not state gets no planned predicate fact and is sent back to extend the requirement
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:41.202Z'
id: SCEN-NEG-model-predicates-grounding-guards-UNSTATED-CLAIM
type: scenario
---
Given a requirement that owns an allow rule and whose claim ledger has no deny claim, when an agent runs predicate modeling for a deny claim under that requirement, then no predicate fact is planned and no relationship is proposed: the action is extend_requirement and the stored allow decision it contradicts is named.

This is the failure side of the ledger guard: a predicate fact for a clause the requirement does not state would be written and stay unlinked. packages/cli/tests/consumer/predicate-grounding-guards.test.ts "a claim the requirement does not state is sent back to extend the requirement, and the stored decision it contradicts is named without a plan" exercises it.
