---
title: A receipt-backed end-to-end test with no executable_for symbol keeps its requirements below tested
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:19.171Z'
id: SCEN-CASE-kibi-conservative-requirement-proof-TEST-NO-EXECUTABLE-SYMBOL
type: scenario
---
Given two requirements specified by a scenario whose end-to-end test has a fresh passing receipt from kibi prove, and no symbol linked to that test with executable_for, when coverage runs, then the executable-symbol stage is missing with the test named, both requirements carry the missing_executable_test_symbol gap and neither reports tested.

The test case "keeps a receipt-backed chain below tested while executable or production symbol links are missing" in documentation/tests/e2e/packed/coverage-proof-status.test.ts exercises it through the packed CLI. It covers the value past the bound, `gt 0`, of qualifying end-to-end tests without executable_for symbols.