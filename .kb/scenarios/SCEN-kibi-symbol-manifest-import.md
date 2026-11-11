---
title: Sync imports every symbol listed in symbols.yaml
status: active
expects: success
tags:
  - positive-path
origin:
  kind: agent
  recorded_at: '2026-11-10T11:00:00.000Z'
id: SCEN-kibi-symbol-manifest-import
type: scenario
---
Given an initialized project whose .kb/symbols.yaml lists two symbols, when sync runs, then both symbols are served by kibi query symbol.

documentation/tests/e2e/packed/issue-93-regression.test.ts "sync imports symbols.yaml entries and retracts a symbol removed from it" exercises it, inside the TEST-015 proof run.
