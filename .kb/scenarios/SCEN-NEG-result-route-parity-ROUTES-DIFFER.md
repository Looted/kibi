---
title: 'Failure side: an MCP tool result and the CLI JSON result carry the same data'
status: active
expects: rejection
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-NEG-result-route-parity-ROUTES-DIFFER
type: scenario
---
Given the same call, data that differs between the two routes fails the parity test's assertions.

## Context

The failure side of REQ-result-route-parity.