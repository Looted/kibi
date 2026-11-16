---
title: The action overwrites commits pushed meanwhile
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:49.884Z'
id: SCEN-NEG-kb-merge-action-branch-moved-VIOLATED
type: scenario
---
An author pushes to the pull request while the action merges it, and the action force-pushes its merge, dropping the author's commit; or it gives up after the first refused push and the conflict stays.

This is the failure side the action must not produce; scripts/tests/kb-merge-action.test.ts checks it.