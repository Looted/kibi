---
title: A usage record that loses the supplied session identifier fails the packed telemetry guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:52:19.106Z'
id: SCEN-CASE-kibi-telemetry-remediation-evidence-DROPPED-SESSION
type: scenario
---
Given fresh packed CLI and MCP runtimes in diagnostic mode, when a skills-list call on each supplies the opaque session identifier session-packed, then each appended usage record carries session_id session-packed, and a record that dropped or replaced it fails the guard.

This covers the value past the bound, `gt 0`, of the claim that no usage record drops a supplied session identifier. documentation/tests/e2e/packed/telemetry-remediation-evidence.test.ts "logs equivalent CLI/MCP correlation and emits deterministic exact repairs" exercises it by asserting the session_id of both usage records.
