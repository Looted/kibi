---
title: A run state from the removed assembled-bundle phase is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T10:45:00.000Z'
id: SCEN-NEG-skillopt-offline-contract-without-bundle-gate-BUNDLE-PHASE
type: scenario
---
Given an offline run state whose phase is the removed assembled-bundle phase, when it is parsed as a 1.0.0 copy or as a 1.1.0 run state, then the run-state contract refuses it, while the same run state in the review phase is accepted, and no published offline contract schema names a bundle.

This is the failure side of the bundle removal: no contract carries a gate, phase or result for a step that no longer runs. documentation/tests/e2e/skillopt-host-neutral-optimization.e2e.ts, in its sixth part where the offline contracts are checked, exercises it.
