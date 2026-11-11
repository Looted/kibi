---
title: 'Before-side gaps and an untouched local gap do not block'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-analysis-gate
type: scenario
---
Given a failed analysis, a syntax gap and a local decorator gap, when the installed analysis gate judges them on the before side, then each one needs nothing; and a local after-side gap away from the changed lines needs nothing either.

This is the success side of the analysis gate. documentation/tests/e2e/packed/impact-review-stage-e.test.ts, in its snapshot and analysis gate step, exercises it.
