---
title: Equal values in unrelated code are reported as one quantity
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:38.512Z'
id: SCEN-NEG-check-quantity-duplicate-pairing-COINCIDENCE
type: scenario
---
Two value facts happen to share the number 5 but their requirements are implemented in different files with nothing else in common, and the check reports them as one quantity.

This is the failure side the rule must not produce; packages/cli/tests/consumer/quantity-duplicate.test.ts checks it.