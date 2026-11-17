---
title: A pair declared distinct is still reported
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:48.048Z'
id: SCEN-NEG-check-quantity-duplicate-distinct-from-REPORTED
type: scenario
---
A fact lists the other's key under distinct_from, and kibi check still reports the pair, so the only way out is to rename a key.

This is the failure side the rule must not produce; packages/cli/tests/consumer/quantity-duplicate.test.ts checks it.