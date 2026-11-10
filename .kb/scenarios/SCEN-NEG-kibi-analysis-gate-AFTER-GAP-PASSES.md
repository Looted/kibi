---
title: 'Failed or syntax-broken after-side analysis blocks the change'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-analysis-gate-AFTER-GAP-PASSES
type: scenario
---
Given a failed analysis, or a partial analysis with a syntax gap away from the changed lines, when the installed analysis gate judges the after side, then the change is blocked; and the public impact-review preparation of a staged malformed file is refused because a parser, syntax, timeout or integrity diagnostic affects the whole file.

This is the failure side of the analysis gate. documentation/tests/e2e/packed/impact-review-stage-e.test.ts, in its malformed source and analysis gate steps, exercises it.
