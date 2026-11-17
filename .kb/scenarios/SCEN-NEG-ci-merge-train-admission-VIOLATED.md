---
title: 'The merge train breaks: only green, labelled pull requests board'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:40:07.604Z'
id: SCEN-NEG-ci-merge-train-admission-VIOLATED
type: scenario
---
A draft is merged into a train because it carries the label.

This is the failure side the merge train must not produce; scripts/tests/merge-train.test.ts checks it.