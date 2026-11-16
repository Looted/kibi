---
title: A value change leaves its twin stale without a word
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T16:10:01.674Z'
id: SCEN-NEG-upsert-quantity-previous-value-MISSED
type: scenario
---
An agent changes a limit under one key from 500 to 400, the twin under another key still says 500, and the result says nothing because the new value no longer matches.

This is the failure side the rule must not produce; packages/cli/tests/consumer/quantity-duplicate.test.ts checks it.