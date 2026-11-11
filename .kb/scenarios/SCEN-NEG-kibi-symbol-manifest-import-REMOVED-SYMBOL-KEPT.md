---
title: Sync retracts a symbol removed from symbols.yaml
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T11:00:00.000Z'
id: SCEN-NEG-kibi-symbol-manifest-import-REMOVED-SYMBOL-KEPT
type: scenario
---
Given a synced project whose .kb/symbols.yaml listed two symbols, when one entry is removed and sync runs again, then kibi query symbol serves only the remaining symbol.

This is the failure side of manifest import: the KB never keeps a symbol the manifest no longer declares. documentation/tests/e2e/packed/issue-93-regression.test.ts "sync imports symbols.yaml entries and retracts a symbol removed from it" exercises it, inside the TEST-015 proof run.
