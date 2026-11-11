---
title: 'A comment-only staged edit is not reported as missing impact evidence'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-behavior-edit-detection-COMMENT-COUNTS
type: scenario
---
Given a synced fixture, when the only staged change to src/sample.js is a new comment line, then the staged check does not report kibi_impact_evidence_missing for it, so treating the comment as a behavior change is refused.

This is the failure side of behavior-edit detection. documentation/tests/e2e/packed/traceability-gate.test.ts, in its comment-only case, exercises it.
