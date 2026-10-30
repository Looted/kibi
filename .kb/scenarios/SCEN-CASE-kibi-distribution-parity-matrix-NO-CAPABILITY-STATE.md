---
title: The parity gate fails when a runtime reports no state for one capability
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:51:46.867Z'
id: SCEN-CASE-kibi-distribution-parity-matrix-NO-CAPABILITY-STATE
type: scenario
---
Given a parity run in which the packed MCP reports every capability except proof_receipts, when the shipped parity matrix builds its report, then the report status is failed and lists a missing_capability_observation issue for packed-mcp and proof_receipts, so a capability without any state never passes as equal.

This covers the value below the bound, `lt 1`, of the claim that capability evidence uses exactly one state. documentation/tests/e2e/packed/distribution-parity-matrix.test.ts "fails the gate when capability evidence has zero or two states or an audited runtime skips the fixture set" exercises it through the packed distribution-parity module.
