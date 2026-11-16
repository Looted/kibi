---
title: A per-test report with an unknown outcome is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T08:23:35.336Z'
id: SCEN-NEG-kibi-proof-step-settings-UNKNOWN-OUTCOME
type: scenario
---
Given a per-test proof report whose test outcome is flaky, when Kibi reads the report, then it refuses the report instead of attributing an outcome. packages/cli/tests/proof/command-test-report-mutation.test.ts exercises it.