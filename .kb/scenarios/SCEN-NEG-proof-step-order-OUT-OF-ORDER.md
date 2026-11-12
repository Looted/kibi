---
title: A later proof step that starts before its build step ends is caught
status: active
expects: rejection
priority: must
tags:
  - negative-path
  - proof
origin:
  kind: agent
  recorded_at: '2026-11-12T16:20:00.000Z'
id: SCEN-NEG-proof-step-order-OUT-OF-ORDER
type: scenario
---
Given a proof contract whose first step builds what its later steps use, with KIBI_PROOF_STEP_CONCURRENCY above one, when the producer starts a later step while the first is still running, then the producer tests fail: they record which steps are running when each step starts and expect no later step of the contract to start while an earlier one runs.

This is the failure side of running a contract's steps in order. scripts/tests/run-proof-producer.test.mjs exercises it.
