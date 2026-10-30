---
title: The parity gate fails when a runtime reports two states for one capability
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:51:39.994Z'
id: SCEN-CASE-kibi-distribution-parity-matrix-TWO-CAPABILITY-STATES
type: scenario
---
Given a parity run in which the packed CLI reports the repair_plan capability twice, once as supported and once as failed, when the shipped parity matrix builds its report, then the report status is failed and lists a duplicate_capability_observation issue for packed-cli and repair_plan instead of picking one of the states.

This covers the value past the bound, `gt 1`, of the claim that capability evidence uses exactly one state. documentation/tests/e2e/packed/distribution-parity-matrix.test.ts "fails the gate when capability evidence has zero or two states or an audited runtime skips the fixture set" exercises it through the packed distribution-parity module.
