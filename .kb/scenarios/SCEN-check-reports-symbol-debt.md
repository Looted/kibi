---
title: An unscoped check lists unrecorded declarations per file and as a total
status: active
expects: success
tags:
  - check
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-check-reports-symbol-debt
type: scenario
---
Given a recorded source file with two declarations that have no symbol record and an unrecorded file with no record at all, when kibi check runs without a rule or file scope, then its JSON symbolDebt lists those two declarations for that file with a total of 2, its text output says they are not blocking, and the check passes. A check scoped to one rule carries no symbolDebt.

documentation/tests/e2e/packed/check-symbol-debt.test.ts exercises it through the installed CLI.