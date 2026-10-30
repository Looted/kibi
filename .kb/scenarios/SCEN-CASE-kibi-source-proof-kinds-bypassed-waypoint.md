---
title: A required waypoint that one path bypasses is rejected by the state_machine check
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:45.139Z'
id: SCEN-CASE-kibi-source-proof-kinds-bypassed-waypoint
type: scenario
---
Given an invoice state machine where every path from draft to paid passes through approved but a path from draft to cancelled does not, when the state_machine check decides the required_waypoints claims, then draft to paid via approved holds and draft to cancelled via approved is rejected with a reason naming the path without approved.

packages/cli/tests/proofs/source-proof-kinds.test.ts "set relations, fields, middleware, reachable pairs and waypoints" exercises this edge case. It covers one waypoint misdecision, `state_machine_waypoint_misdecisions gt 0`.
