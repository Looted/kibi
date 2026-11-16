---
title: Inherited gaps are not silently dropped and do not block
status: active
expects: rejection
tags:
  - negative-path
  - staged-gate
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-NEG-staged-gate-reports-inherited-symbol-gaps-INHERITED-GAP-SILENT
type: scenario
---
Given the same commit, the staged check neither hides the untouched unrecorded declaration nor reports it as an error: it exits successfully with the note.

documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts exercises it through the installed CLI.