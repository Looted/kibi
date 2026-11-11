---
title: A failing proof run without a usable per-test report fails every selected test
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T17:00:00.000Z'
id: SCEN-NEG-kibi-proof-per-test-attribution-UNATTRIBUTABLE-FAILURE
type: scenario
---
Given a command proof integration that runs two proof-bearing tests in one process and exits 1, when its kibi.proof-test-report.v1 is missing, is not valid JSON, or omits one of the selected tests, then kibi prove evaluates the run as one unit: both tests get failed receipts, the run is attributed as aggregate, and the summary names why the report was rejected.

This is the failure side of per-test attribution. packages/cli/tests/consumer/proof-receipt-compaction.test.ts "a failing step fails only the test that owns it, and an unattributable failure fails every selected test" exercises all three report defects through the consumer CLI.
