---
title: A participant argument never binds to the identifier the requirement constrains
status: active
tags:
  - modeling
  - predicates
  - bindings
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: onboarding evaluation round 9 finding K19'
  recorded_at: '2026-10-09T07:20:38.834Z'
id: SCEN-model-predicates-participant-not-subject
type: scenario
---
Given a requirement that constrains a component identifier and a claim that names no actor, when kb_model mode predicates matches a schema whose first argument is an actor, then the actor stays unbound, the candidate is incomplete and the binding hint says the claim names no actor, that the constrained identifier is not a participant and that record_ontology_gap is the fallback when the schema does not fit; an explicit actor binding equal to that identifier is rejected with that reason. The constrained identifiers are offered as examples only for the argument that names what the claim is about and for entity-typed arguments, and a claim that names the actor in a short noun still binds it and gets a complete plan.