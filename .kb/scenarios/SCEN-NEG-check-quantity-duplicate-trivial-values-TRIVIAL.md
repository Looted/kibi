---
title: Facts sharing 0, 1 or a boolean are reported as one quantity
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:43.012Z'
id: SCEN-NEG-check-quantity-duplicate-trivial-values-TRIVIAL
type: scenario
---
Two facts that both state zero failures, or both state true, are reported as one quantity although they say nothing alike.

This is the failure side the rule must not produce; packages/cli/tests/consumer/quantity-duplicate.test.ts checks it.