---
title: 'A requirement with no test evidence gets a non-blocking coverage depth review'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-coverage-depth-quality-UNREPORTED-SHALLOW
type: scenario
---
Given a packed workspace whose current requirement has no linked test, when kibi check runs with JSON output, then it exits 0 and its quality diagnostics carry a coverage_depth_review for that requirement with coverage depth no_test_evidence and blocking false.

This is the failure side of coverage depth: shallow evidence is never silently accepted, and never blocks the change either. documentation/tests/e2e/packed/cli-workflows.test.ts, in its non-blocking diagnostics case for REQ-001, exercises it.
