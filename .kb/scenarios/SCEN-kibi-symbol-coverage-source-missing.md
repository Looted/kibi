---
title: A linked symbol whose source file is deleted is reported uncovered
status: active
expects: success
tags:
  - coverage
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
id: SCEN-kibi-symbol-coverage-source-missing
type: scenario
---
Given two production symbols that implement a requirement and are covered by its test, when one symbol's source file is deleted from the workspace, then symbol coverage reports that symbol as uncovered with the source_missing gap, lists it among the failing rows, and keeps the other symbol fully covered.

documentation/tests/e2e/packed/symbol-coverage-missing-source.test.ts exercises it through the installed CLI.