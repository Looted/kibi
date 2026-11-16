---
title: A command step reports each test's outcome through the per-test report
status: active
priority: must
expects: success
tags:
  - proof
origin:
  kind: agent
  recorded_at: '2026-11-16T08:23:34.334Z'
id: SCEN-kibi-proof-test-report-outcomes
type: scenario
---
Given a command proof step, when Kibi runs it with KIBI_PROOF_TEST_REPORT naming a report path and the step writes a kibi.proof-test-report.v1 report whose tests are passed, failed, timed_out, errored or interrupted, then Kibi reads each outcome and attributes it to that test.