---
title: An edit to a recorded function passes while an untouched neighbour stays unrecorded
status: active
expects: success
tags:
  - staged-gate
  - symbols
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-staged-gate-judges-changed-declarations
type: scenario
---
Given a source file where only one function has a symbol record and a constant next to it has none, when a commit changes only the recorded function, then kibi check --staged passes. When a commit instead renames the recorded function, the staged check blocks and names the record whose declaration is gone.

documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts exercises it through the installed CLI.