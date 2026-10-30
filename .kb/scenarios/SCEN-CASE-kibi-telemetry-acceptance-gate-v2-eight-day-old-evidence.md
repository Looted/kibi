---
title: Otherwise complete usage evidence that is eight days old leaves the acceptance gate insufficient
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:30.696Z'
id: SCEN-CASE-kibi-telemetry-acceptance-gate-v2-eight-day-old-evidence
type: scenario
---
Given a packed Kibi installation whose usage log holds the complete passing workflow evidence, all timestamped eight days ago, when kibi usage-metrics runs with --require-acceptance, then the kibi.telemetry-acceptance.v1 report has status insufficient_evidence with the usage_log_stale diagnostic and the command exits with status 1.

The test case documentation/tests/e2e/packed/telemetry-acceptance-gate.test.ts "keeps otherwise complete evidence older than seven days insufficient" exercises it. It covers the value past the bound of passing report evidence age, `gt 7` days.