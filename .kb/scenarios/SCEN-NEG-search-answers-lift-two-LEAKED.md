---
title: A search answer that leaves a two-hop test or assumed fact unlifted is refused
status: active
priority: should
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T19:28:05.973Z'
id: SCEN-NEG-search-answers-lift-two-LEAKED
type: scenario
---
Given a matched test two hops from its requirement or a fact only a scenario assumes, when the search answer lists it as ungoverned beside the requirement it reaches, or lifts a current ADR into a requirement, then it is refused.