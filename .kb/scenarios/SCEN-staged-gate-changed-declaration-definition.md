---
title: A comment or whitespace edit leaves a declaration out of the change
status: active
expects: success
tags:
  - staged-gate
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: SCEN-staged-gate-changed-declaration-definition
type: scenario
---
Given an unrecorded constant at the base commit, when a commit only adds a comment inside it and reformats its whitespace while changing a recorded function, then the constant is not in the change and the staged check passes.

documentation/tests/e2e/packed/staged-inherited-symbol-gaps.test.ts exercises it through the installed CLI.