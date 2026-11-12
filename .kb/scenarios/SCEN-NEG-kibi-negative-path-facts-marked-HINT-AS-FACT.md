---
title: A search hint on a negative-path fact shows the requirement it guards, not the fact
status: active
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-11T17:20:37.598Z'
id: SCEN-NEG-kibi-negative-path-facts-marked-HINT-AS-FACT
type: scenario
---
Given a search-hints provider returns a negative-path fact for a weak answer, when kb_search builds its hints, the hint is the current requirement the fact guards with via naming the fact; a fact whose guards are not current is shown as itself, titled "Forbidden: ..." and carrying negativePath. packages/cli/tests/negative-path-facts.test.ts "lifted to its requirement, or titled as forbidden when none is current" exercises it.

This is the failure side of the negative-path facts requirement.