---
title: A complete predicate candidate for an already grounded claim gets no second grounding link
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:20.417Z'
id: SCEN-NEG-model-predicates-grounding-aware-v2-SECOND-GROUNDING
type: scenario
---
Given a requirement whose claim is already grounded by a requires_property fact with the same claim key, when an agent runs predicate modeling and a complete predicate candidate fits, then no write plan or relationship plan is returned that would add a second grounding link; the answer is replace_grounding with a replacement plan that retracts the old link.

This is the failure side of single grounding per claim: a fitting predicate must not be linked beside an existing grounding of the same claim. packages/cli/tests/operations/suggest-predicates-existing-grounding.test.ts "grounded claim with a complete candidate answers replace_grounding with no write plan and a consistent replacement plan" exercises it.
