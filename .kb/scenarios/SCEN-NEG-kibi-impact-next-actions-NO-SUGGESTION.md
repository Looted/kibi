---
title: 'A coarse module symbol is a blocking granularity diagnostic that names its repair'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-impact-next-actions-NO-SUGGESTION
type: scenario
---
Given the same fixture plus a whole-file symbol that implements REQ-001 next to the narrow hello declaration, when the impact check runs, then it reports a blocking symbol_granularity_violation, and every blocking diagnostic carries a non-empty suggestion that names the narrow symbol or granularity_reason.

This is the failure side of the impact check report. documentation/tests/e2e/packed/traceability-gate.test.ts, in its impact report case, exercises it.
