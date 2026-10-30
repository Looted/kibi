---
title: An actor bound to the requirement's constrained identifier is refused and the gap is recorded
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:02.188Z'
id: SCEN-NEG-model-predicates-participant-not-subject-SUBJECT-AS-ACTOR
type: scenario
---
Given a requirement that constrains a component identifier and a claim that names no actor, when an agent runs predicate modeling for permission_rule with the actor bound to that identifier, then the binding is refused: the actor stays unbound, no permission plan is produced, the ontology gap observation is planned and the hint says the identifier is the requirement's subject key and the claim names no actor.

This is the failure side of the participant check: the component a requirement is about must never pass as the actor of its own rule. packages/cli/tests/operations/predicate-participant-subject.test.ts "binding actor to the subject key does not complete the predicate; the claim names no actor, so the schema does not fit" exercises it.
