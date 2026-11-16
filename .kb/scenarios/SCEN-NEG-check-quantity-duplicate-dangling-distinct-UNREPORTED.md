---
title: A distinct_from entry naming nothing passes the check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:52.586Z'
id: SCEN-NEG-check-quantity-duplicate-dangling-distinct-UNREPORTED
type: scenario
---
A value fact keeps a distinct_from entry for a key no fact uses any more, and kibi check says nothing about it.

This is the failure side the rule must not produce; packages/cli/tests/consumer/quantity-duplicate.test.ts checks it.