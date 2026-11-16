---
title: The staged check names the untouched unrecorded declarations in a note
status: active
expects: success
tags:
  - staged-gate
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-staged-gate-reports-inherited-symbol-gaps
type: scenario
---
Given a partially recorded file, when a commit changes only its recorded function, then kibi check --staged prints a Symbol records line for that file with the number of declarations it did not touch, saying no action is required, and its JSON output lists them under inheritedSymbolGaps.

documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts exercises it through the installed CLI.