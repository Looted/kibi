---
title: An unrecorded change still lacks evidence
status: active
expects: rejection
tags:
  - negative-path
  - staged-gate
  - symbols
  - impact
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-NEG-staged-evidence-scoped-to-changed-declarations-UNRECORDED-CHANGE-ACCEPTED
type: scenario
---
Given the same file, when a commit adds a function that has no symbol record, then the staged check blocks the commit with symbols_manifest_stale for that file.

documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts exercises it through the installed CLI.