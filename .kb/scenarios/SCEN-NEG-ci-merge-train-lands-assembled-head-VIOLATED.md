---
title: 'The merge train breaks: a green train lands its proven tree'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:40:09.498Z'
id: SCEN-NEG-ci-merge-train-lands-assembled-head-VIOLATED
type: scenario
---
Develop moved after the train was assembled and the train still merges, so develop gets a tree no check ran on.

This is the failure side the merge train must not produce; scripts/tests/merge-train.test.ts checks it.