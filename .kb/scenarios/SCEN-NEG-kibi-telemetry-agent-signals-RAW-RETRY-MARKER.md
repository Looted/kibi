---
title: A retry marker stays on the machine as a one-way hash
status: active
expects: rejection
tags:
  - negative-path
  - telemetry
origin:
  kind: agent
  recorded_at: '2026-11-05T07:55:00.000Z'
id: SCEN-NEG-kibi-telemetry-agent-signals-RAW-RETRY-MARKER
type: scenario
---
Given a workspace with telemetry on and a local collector, when the same refused upsert of REQ-private-retry-target runs twice, then the local recall file holds one 16-character hex marker for both calls, no file Kibi keeps holds the raw entity id or the workspace path, no queued or sent event holds the marker, and nothing sent holds the raw id.

This is the failure side of keeping recall markers local: a raw id or a marker that left the machine would let telemetry identify what the agent worked on. packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts "a retry marker stays on the machine as a one-way hash, never the raw entity id" exercises it.
