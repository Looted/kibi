---
title: A symbol whose source file is gone is not counted as covered
status: active
expects: rejection
tags:
  - negative-path
  - coverage
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
id: SCEN-NEG-kibi-symbol-coverage-VANISHED-SOURCE-COVERED
type: scenario
---
Given a production symbol with complete requirement and test links, when its source file no longer exists, then symbol coverage does not count it as fully covered, even before the next sync.

documentation/tests/e2e/packed/symbol-coverage-missing-source.test.ts exercises it through the installed CLI.