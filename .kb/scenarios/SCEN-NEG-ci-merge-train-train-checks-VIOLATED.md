---
title: 'The merge train breaks: a train lands before its train checks passed'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T14:37:36.161Z'
id: SCEN-NEG-ci-merge-train-train-checks-VIOLATED
type: scenario
---
A train merges while its train-only proof is still running, because the pull requests' own checks passed on its head.

This is the failure side the merge train must not produce; scripts/tests/merge-train.test.ts checks it.