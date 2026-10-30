---
title: A grounding plan that contradicts a stored permission decision is blocked before any write
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:39.526Z'
id: SCEN-NEG-model-what-if-planned-facts-CONFLICTING-PLAN
type: scenario
---
Given a KB that stores an allow permission_rule for coaches reading unassigned analysis requests, when an agent runs predicate modeling for a requirement that denies the same permission with complete bindings, then the hash-bound compile plan has status blocked with a contradiction analysis naming the conflict, and the requirement dry run with the planned fact staged is refused.

This is the failure side of the what-if grounding plan: a conflicting decision must surface before the fact is written, not after. packages/cli/tests/consumer/planned-facts-what-if.test.ts "kb_model reports the decision conflict in its plan, the dry run refuses the requirement with its planned fact staged, and a non-conflicting plan applies through kb_apply_plan" exercises it.
