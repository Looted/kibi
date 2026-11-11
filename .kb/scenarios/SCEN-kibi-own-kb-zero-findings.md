---
title: 'A clean kibi check passes the gate that CI and the pre-push proof check run'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-own-kb-zero-findings
type: scenario
---
Given check output with empty violations and qualityDiagnostics arrays, when scripts/kb-zero-findings.sh runs, then it exits 0 and prints that the KB has zero findings. The CI integration job and scripts/proof-prepush.sh both run the gate.

## Context

Run by the CI workflow contract test, which runs the gate against a stubbed check and asserts both callers.
