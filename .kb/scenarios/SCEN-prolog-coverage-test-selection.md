---
title: Later selected Prolog test file runs and contributes coverage
status: active
tags:
  - prolog
  - coverage
  - testing
id: SCEN-prolog-coverage-test-selection
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Given two Prolog test files supplied with repeated `--test` options and the second file contains a failing case, when the coverage runner executes, then the second case appears in the failure output, the run fails, and the second file appears in annotated coverage artifacts.