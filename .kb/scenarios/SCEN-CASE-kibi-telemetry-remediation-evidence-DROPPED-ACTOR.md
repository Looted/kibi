---
title: A usage record that loses the supplied actor identifier fails the packed telemetry guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:52:11.132Z'
id: SCEN-CASE-kibi-telemetry-remediation-evidence-DROPPED-ACTOR
type: scenario
---
Given fresh packed CLI and MCP runtimes in diagnostic mode, when a skills-list call on each supplies the opaque actor identifier actor-packed, then each appended usage record carries actor_id actor-packed, and a record that dropped or replaced it fails the guard.

This covers the value past the bound, `gt 0`, of the claim that no usage record drops a supplied actor identifier. documentation/tests/e2e/packed/telemetry-remediation-evidence.test.ts "logs equivalent CLI/MCP correlation and emits deterministic exact repairs" exercises it by asserting the actor_id of both usage records.
