---
title: Malformed timing observations are rejected and missing ones stay unavailable instead of being reported as measured
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:59:41.116Z'
id: SCEN-NEG-installed-staged-impact-timing-integrity-malformed-timing
type: scenario
---
Given source-analysis timing traces that are malformed, oversized or truncated, when the installed staged-impact benchmark parses them, then malformed observations throw, missing values stay null with an unavailable status, and truncated traces are marked truncated with no observations.

This is the failure side of bounded, fail-closed timing: the benchmark must never weaken a parse failure into a measurement or claim evidence it does not have. scripts/benchmark-installed-staged-impact.test.mjs "source-analysis timing parser preserves missing values and rejects malformed observations" exercises it.
