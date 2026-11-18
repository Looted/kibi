---
title: 'The merge actions break: a merged-tree command receives the merge token'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-18T08:27:37.739Z'
id: SCEN-NEG-ci-merge-actions-tree-commands-tokens-VIOLATED
type: scenario
---
A train or a kb-merge run executes the pull request version of the check script with GH_TOKEN in its environment.

This is the failure side the merge actions must not produce; scripts/tests/merge-train.test.ts checks it.