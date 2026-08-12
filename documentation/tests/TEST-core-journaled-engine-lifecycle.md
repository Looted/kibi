---
id: TEST-core-journaled-engine-lifecycle
title: Engine daemon serialization, recovery, and protocol fencing
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
priority: must
tags: [cli, engine, lifecycle]
links:
  - type: validates
    target: SCEN-core-journaled-engine-lifecycle
  - type: validates
    target: REQ-core-journaled-engine-persistence
---

The daemon suite starts simultaneous clients, verifies one socket and ordered
requests, exercises disconnects and stop/restart recovery, checks branch
isolation and protocol/workspace mismatch errors, and reports an actionable
failure when the configured Node host is unavailable.
