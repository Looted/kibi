---
title: Two keys for one quantity pass the check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:33.948Z'
id: SCEN-NEG-check-quantity-duplicate-UNREPORTED
type: scenario
---
Two requirements ground the same limit under different keys, their code lives in one file, and kibi check passes, so a later change to one key leaves the other stale.

This is the failure side the rule must not produce; packages/cli/tests/consumer/quantity-duplicate.test.ts checks it.