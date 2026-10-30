---
title: A current requirement without a logic_claims manifest is reported as non-blocking logical-coverage debt
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:16.260Z'
id: SCEN-CASE-kibi-logical-requirement-coverage-unreported-manifest-debt
type: scenario
---
Given a synced workspace whose current requirement REQ-001 has no logic_claims manifest, when the packed CLI runs kibi check, then the check passes and reports one non-blocking logical_coverage_review diagnostic for REQ-001 naming the missing manifest.

documentation/tests/e2e/packed/cli-workflows.test.ts "should report a non-blocking logical-coverage debt diagnostic for a requirement without a logic_claims manifest" exercises this edge case. It covers one unmanifested requirement without a debt diagnostic, `unmanifested_requirements_without_debt_diagnostic gt 0`.
