---
title: Symbol debt never fails the check
status: active
expects: rejection
tags:
  - negative-path
  - check
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-NEG-check-reports-symbol-debt-SYMBOL-DEBT-BLOCKS
type: scenario
---
Given the same repository, unrecorded declarations do not add a violation to kibi check and do not change its exit status.

documentation/tests/e2e/packed/check-symbol-debt.test.ts exercises it through the installed CLI.