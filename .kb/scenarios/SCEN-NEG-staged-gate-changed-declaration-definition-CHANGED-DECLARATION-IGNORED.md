---
title: A value edit to an unrecorded constant is not ignored
status: active
expects: rejection
tags:
  - negative-path
  - staged-gate
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-NEG-staged-gate-changed-declaration-definition-CHANGED-DECLARATION-IGNORED
type: scenario
---
Given the same unrecorded constant, when a commit changes its value, then the constant is in the change and the staged check blocks, naming it as missing from .kb/symbols.yaml.

documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts exercises it through the installed CLI.