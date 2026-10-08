---
title: A participant argument holding a clause of the claim stays unbound
status: active
priority: must
tags:
  - modeling
  - predicates
  - bindings
origin:
  kind: agent
  recorded_at: '2026-10-08T21:04:57.468Z'
id: SCEN-model-predicates-binding-clauses
type: scenario
---
Given a claim whose text before the modal verb is a long clause, when kb_model mode predicates matches a schema whose first argument names an actor, then that argument stays unbound, the candidate is incomplete and the binding hint says the value is a clause of the claim; a claim that names the actor in a short noun still binds it and gets a complete plan.