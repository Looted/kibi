---
title: A hidden marker leaked by a Claude Code cell is caught by the shared leak scan
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:34:10.298Z'
id: SCEN-CASE-skillopt-operator-selected-harness-LEAK-SCAN-BYPASS
type: scenario
---
Given a target cell run on the Claude Code host whose stub model answer repeats a hidden marker, when the cell runner normalizes the Claude stream and replays the episode with that marker, then the shared leak scan records hidden_data_leakage, the leak is a critical failure, and the cell is a behavioral failure scored 0.

This covers the edge case of a supported harness that would bypass the shared leak scan, the value past the bound `gt 0`: the Claude Code path is held to the same scan as Codex. documentation/tests/e2e/skillopt-claude-code-host.e2e.ts, in its fifth part where a hidden marker the Claude stub repeats is caught by the shared leak scan, exercises it.
