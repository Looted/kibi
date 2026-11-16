---
title: A behavioral record without an implements link is still flagged
status: active
expects: rejection
tags:
  - negative-path
  - symbols
  - traceability
  - coverage
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-NEG-symbol-traceability-behavioral-only-BEHAVIORAL-EXEMPTED
type: scenario
---
Given a behavioral-role symbol record with no implements link, when kibi check runs the symbol-traceability rule, then it reports that symbol.

documentation/tests/e2e/packed/check-symbol-debt.test.ts exercises it through the installed CLI.