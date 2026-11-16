---
title: An unscoped kb_check result over its budget is cut like a scoped one
status: active
expects: success
tags:
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
id: SCEN-check-unscoped-budget
type: scenario
---
Given a check without rules or sourceFiles whose findings and migration plan exceed 24,000 characters, when kb_check runs, then advisory findings become counts by id, the migration plan becomes its summary unless includeMigrationPlan is set, blocking findings past the budget are grouped by rule, count keeps the full number, truncation says how to list every finding, and an asked-for symbol debt list comes on top. A rule selection and the kibi check command list every finding.

packages/cli/tests/public/operations/check-scope.test.ts and packages/cli/tests/public-mutation/operations/check-executor.mutation.test.ts exercise it.