---
title: An implementing symbol that no passing end-to-end test covers keeps the requirement below tested
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:29.946Z'
id: SCEN-CASE-kibi-conservative-requirement-proof-SYMBOL-UNCOVERED
type: scenario
---
Given a requirement whose scenario test has a fresh passing receipt and one production symbol that implements the requirement but has no covered_by link to that test, when coverage runs, then the production-symbol stage lists the symbol as uncovered, the requirement carries the missing_production_symbol_coverage gap and it does not report tested.

The test case "keeps a receipt-backed chain below tested while executable or production symbol links are missing" in documentation/tests/e2e/packed/coverage-proof-status.test.ts exercises it through the packed CLI. It covers the value past the bound, `gt 0`, of proof-bearing production symbols without a qualifying end-to-end test.