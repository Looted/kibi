---
title: The repository search gate asks no gold question twice after its off-gold-set warm-up
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:14.198Z'
id: SCEN-CASE-kibi-search-gold-set-gate-gold-question-asked-twice
type: scenario
---
Given a consumer KB and a recording stand-in for the kibi CLI, when the repository search gate runs, then the first search is a warm-up question outside the gold set and each gold question appears exactly once afterwards, so a question asked twice fails the test.

scripts/tests/repo-search-gold-gate.test.ts "the gate warms up off the gold set and asks each gold question exactly once" exercises this edge case by counting every search the gate sends. It covers the value past the bound, `asks_per_gold_question_after_off_gold_set_warmup gt 1`.
