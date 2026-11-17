---
title: 'The merge train breaks: a failed train finds the failing pull request'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:40:11.531Z'
id: SCEN-NEG-ci-merge-train-failure-bisect-VIOLATED
type: scenario
---
A failed train ejects its newest pull request without proving it fails.

This is the failure side the merge train must not produce; scripts/tests/merge-train.test.ts checks it.