---
title: A kb_check result that repeats an impact diagnostic is caught
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - check
origin:
  kind: agent
  recorded_at: '2026-11-12T14:41:40.978Z'
id: SCEN-NEG-kb-check-impact-diagnostics-once-REPEATED
type: scenario
---
Given a `kb_check` call with `sourceFiles` whose impact analysis reports `multi_requirement_symbol_review`, when the result lists that diagnostic again under `qualityDiagnostics` or copies it into the evidence of its migration plan action, then the check tests fail: they expect it under `impactDiagnostics` only and the plan action to name it by id.

This is the failure side of listing each impact diagnostic once. packages/mcp/tests/tools/check-impact.test.ts, packages/cli/tests/public-mutation/operations/check-format-shared.mutation.test.ts and packages/cli/tests/public/operations/migration-plan-coverage.test.ts exercise it.
