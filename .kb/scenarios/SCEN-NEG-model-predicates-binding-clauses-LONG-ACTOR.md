---
title: A participant argument extracted as a long clause of the claim is refused as a binding
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:25.381Z'
id: SCEN-NEG-model-predicates-binding-clauses-LONG-ACTOR
type: scenario
---
Given a claim whose text before the modal verb is a seven-word clause, when predicate modeling matches the permission_rule schema, then the actor argument is not accepted as a binding: the candidate stays incomplete with actor unbound, no permission plan is produced, and the binding hint says the value is a clause longer than three words.

This is the failure side of the participant word limit: a long fragment of the claim must not pass as the name of an actor or entity. packages/cli/tests/operations/predicate-binding-placeholders.test.ts "an extracted actor longer than three words is unbound with a hint" exercises it.
