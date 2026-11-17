---
title: A write that restates a quantity under a new key says nothing
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:57.555Z'
id: SCEN-NEG-upsert-names-quantity-twin-UNNAMED
type: scenario
---
An agent writes a value fact that states an existing limit under a new key, and the result carries no warning, so the split is only found later by kibi check.

This is the failure side the rule must not produce; packages/cli/tests/consumer/quantity-duplicate.test.ts checks it.