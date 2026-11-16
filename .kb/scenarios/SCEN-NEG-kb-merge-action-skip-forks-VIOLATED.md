---
title: The action tries to merge a fork pull request
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:50.662Z'
id: SCEN-NEG-kb-merge-action-skip-forks-VIOLATED
type: scenario
---
The action merges a pull request whose branch lives in a fork and fails when its push is denied, failing the run for every other pull request's report.

This is the failure side the action must not produce; scripts/tests/kb-merge-action.test.ts checks it.