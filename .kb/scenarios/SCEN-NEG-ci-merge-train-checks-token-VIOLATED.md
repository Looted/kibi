---
title: 'The train stalls: check runs read with a fine-grained token'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-18T14:19:05.909Z'
id: SCEN-NEG-ci-merge-train-checks-token-VIOLATED
type: scenario
---
Every train step fails with HTTP 403 because the train reads check runs with a fine-grained token, which cannot read them.

This is the failure side the merge train must not produce; scripts/tests/merge-train.test.ts checks it.