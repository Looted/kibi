---
title: A later step of a proof contract waits for its earlier steps
status: active
origin:
  kind: agent
  recorded_at: '2026-11-12T16:20:00.000Z'
id: SCEN-proof-step-order
type: scenario
---
Given selected proof contracts whose steps the producer runs in a pool of more than one, and a contract whose second step reads what its first step builds, when the producer runs them, then the second step starts only after the first has finished, while steps of other contracts run beside it.

A step shared by several contracts runs once and waits for the earlier steps of each contract that declares it. scripts/tests/run-proof-producer.test.mjs asserts the order of the groups and that a later step does not start before an earlier one ends.
