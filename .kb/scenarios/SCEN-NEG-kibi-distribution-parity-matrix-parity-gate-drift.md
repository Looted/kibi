---
title: The parity gate fails on source-to-packed drift, unresolved provenance, execution failure and unactioned project divergence
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:34:51.087Z'
id: SCEN-NEG-kibi-distribution-parity-matrix-parity-gate-drift
type: scenario
---
Given a parity run in which the packed CLI outcome drifts from source for one capability, the packed MCP has no resolved executable and fails one capability, and a project runtime does not support a capability without an upgrade or compatibility action, when the shipped parity matrix builds its report, then the report status is failed and names each of those issues, and the unsupported capability is never counted as a match.

This is the failure side of the distribution parity gate: any drift or missing evidence must fail the gate instead of passing as equal behavior. documentation/tests/e2e/packed/distribution-parity-matrix.test.ts "fails the gate for source-to-packed drift, unresolved provenance, execution failure and an unactioned project divergence" exercises it.
