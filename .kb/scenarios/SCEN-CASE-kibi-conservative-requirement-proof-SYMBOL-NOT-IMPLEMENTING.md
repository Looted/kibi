---
title: A symbol the passing test covers but that does not implement the requirement does not count as its proof
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:40.281Z'
id: SCEN-CASE-kibi-conservative-requirement-proof-SYMBOL-NOT-IMPLEMENTING
type: scenario
---
Given a requirement whose scenario test has a fresh passing receipt and covers one production symbol that has no implements link to the requirement, when coverage runs, then the symbol is not counted as the requirement's production symbol, the stage lists none, the requirement carries the missing_production_symbol gap and it does not report tested.

The test case "keeps a receipt-backed chain below tested while executable or production symbol links are missing" in documentation/tests/e2e/packed/coverage-proof-status.test.ts exercises it through the packed CLI. It covers the value past the bound, `gt 0`, of proof-bearing production symbols that do not implement the requirement.