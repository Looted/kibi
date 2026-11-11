---
title: 'One info finding, or check output without qualityDiagnostics, fails the gate'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-own-kb-zero-findings
type: scenario
---
Given check output with one info-level quality diagnostic, or output with no qualityDiagnostics array, when scripts/kb-zero-findings.sh runs, then it exits 1 and names the finding or the missing array.

## Context

Run by the CI workflow contract test against a stubbed check.
