---
title: A participant argument never binds to the requirement's subject key
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
Given a requirement that constrains a subject key and a claim that names no actor, when kb_model mode predicates matches a schema whose first argument is an actor, then the actor stays unbound, the candidate is incomplete and the binding hint says the claim names no actor, that the subject key is not a participant and that record_ontology_gap is the fallback when the schema does not fit; an explicit actor binding equal to the constrained subject key is rejected with that reason. Subject keys are offered as examples only for the subject argument and for entity-typed arguments, and a claim that names the actor in a short noun still binds it and gets a complete plan.