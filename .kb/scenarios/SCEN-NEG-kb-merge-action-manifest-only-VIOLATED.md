---
title: The action pushes a merge that resolved a code conflict
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:48.481Z'
id: SCEN-NEG-kb-merge-action-manifest-only-VIOLATED
type: scenario
---
A pull request conflicts in a source file as well as in .kb/symbols.yaml, and the action merges it anyway, settling a conflict a person had to decide.

This is the failure side the action must not produce; scripts/tests/kb-merge-action.test.ts checks it.