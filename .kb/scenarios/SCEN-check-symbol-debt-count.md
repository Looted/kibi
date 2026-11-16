---
title: An unscoped check counts unrecorded declarations and lists them on request
status: active
expects: success
tags:
  - check
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
id: SCEN-check-symbol-debt-count
type: scenario
---
Given a recorded source file with two declarations that have no symbol record and an unrecorded file with no record at all, when kibi check runs without a rule or file scope, then its JSON symbolDebt is a total of 2 in 1 file with no per-file list, its text verdict counts them as not blocking, and the check passes. With kibi check --symbol-debt, or kb_check with includeSymbolDebt:true, the JSON lists both declarations under that file and the text lists them after the verdict. A check scoped to one rule carries no symbolDebt.

documentation/tests/e2e/packed/check-symbol-debt.test.ts exercises it through the installed CLI.