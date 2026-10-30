---
title: The repository search gate skips no gold question after its warm-up
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:21.720Z'
id: SCEN-CASE-kibi-search-gold-set-gate-gold-question-skipped
type: scenario
---
Given a consumer KB and a recording stand-in for the kibi CLI, when the repository search gate runs, then every gold question appears in the recorded searches after the warm-up, in gold-set order, so a skipped question fails the test.

scripts/tests/repo-search-gold-gate.test.ts "the gate warms up off the gold set and asks each gold question exactly once" exercises this edge case by comparing the recorded searches with the gold set. It covers the value below the bound, `asks_per_gold_question_after_off_gold_set_warmup lt 1`.
