---
title: A later selected Prolog test file that is not annotated fails the coverage runner check
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:22.759Z'
id: SCEN-CASE-prolog-coverage-test-selection-test-file-not-annotated
type: scenario
---
Given two Prolog test files selected with repeated --test options, the second in a separate later-tests directory, when the coverage runner runs them, then the summary's annotated files include the second file, so a run that leaves a selected test file out of the annotated coverage artifacts fails the check.

The test case packages/core/tests/prolog-coverage-runner.test.ts "runs every supplied test file, including a later failing suite" exercises it. It covers the value past the bound of selected test files missing from annotated coverage, `gt 0`.