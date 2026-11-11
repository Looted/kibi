---
title: 'A coarse service spanning unrelated tag clusters is reported as a non-blocking diagnostic'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-symbol-granularity-quality-UNREPORTED
type: scenario
---
Given the same workspace after the shared widget tag is removed, when kibi check runs, then it reports one component_mixed_purpose_review on SYM-WIDGET-SERVICE that is not blocking, names SYM-WIDGET-RENDER as a narrower symbol, and adds no mixed-purpose violation.

This is the failure side of the mixed-purpose diagnostic. documentation/tests/e2e/packed/init-sync-check.test.ts, in its mixed-purpose case, exercises it.
