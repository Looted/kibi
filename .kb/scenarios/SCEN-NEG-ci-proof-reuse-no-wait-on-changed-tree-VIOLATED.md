---
title: The reuse check waits on a proof it can never reuse
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:15.457Z'
id: SCEN-NEG-ci-proof-reuse-no-wait-on-changed-tree-VIOLATED
type: scenario
---
The reuse check waits for develop's proof run although the merge already changes snapshot files, so every pull request refreshed while develop proves loses the whole wait budget and then runs the full proof anyway.

This is the failure side the reuse check must not produce; scripts/tests/ci-proof-reuse-main.coverage.test.ts checks it.