---
title: A false abstention caused by a superseded requirement is listed in the gate output
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:05.534Z'
id: SCEN-CASE-kibi-search-gold-set-gate-unlisted-regression
type: scenario
---
Given a consumer KB where the requirement a gold question expects has been superseded, when the repository search gate runs, then it fails, lists the question under falseAbstentions and prints the missed abstention precision threshold, so the regression is not left out of its output.

scripts/tests/repo-search-gold-gate.test.ts "superseding a requirement the gold set expects fails the gate and lists the false abstention" exercises this edge case. It covers one regression missing from the gate output, `gold_set_regressions_missing_from_gate_output gt 0`.
