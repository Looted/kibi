---
id: SCEN-core-journaled-engine-lifecycle
title: Shared engine daemon lifecycle and branch isolation
type: scenario
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/scenarios/SCEN-core-journaled-engine-lifecycle.md
tags: [core, engine, lifecycle]
links:
  - type: verified_by
    target: TEST-core-journaled-engine-lifecycle
---

Given concurrent CLI and MCP clients use the same workspace and branch
When they connect or disconnect while requests are in flight
Then one serialized engine owns the SWI process, requests remain ordered, and
the daemon flushes before idle shutdown or crash recovery.

Different branches and workspaces receive independent sockets and persisted
graphs; a protocol or workspace identity mismatch is rejected.
