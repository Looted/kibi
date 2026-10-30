---
title: Bindings that only repeat the argument names do not complete a predicate plan
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:44.198Z'
id: SCEN-NEG-model-predicates-binding-placeholders-SCHEMA-NAMED
type: scenario
---
Given the claim "Saved invoices should remain visible after a reload." and the temporal_order schema, when an agent calls predicate modeling with before_event bound to "before_event" and after_event bound to "after_event", then the bindings are refused: the candidate stays incomplete with both arguments unbound, the action is provide_argument_bindings and no apply plan is returned.

This is the failure side of placeholder detection: a binding that only repeats a field name must not produce a complete grounding plan. packages/cli/tests/operations/predicate-binding-placeholders.test.ts "a schema-named binding no longer completes a predicate plan" exercises it.
