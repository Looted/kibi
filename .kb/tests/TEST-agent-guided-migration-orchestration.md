---
id: TEST-agent-guided-migration-orchestration
title: Migration plan hashing, safety gates, and post-apply readback
status: active
created_at: 2026-08-14T00:00:00Z
updated_at: 2026-08-14T00:00:00Z
priority: must
links:
  - type: validates
    target: SCEN-agent-guided-migration-orchestration
  - type: validates
    target: REQ-agent-guided-migration-orchestration
---

The migration orchestration suite verifies deterministic plan hashes and action
ordering, preview immutability, stale-hash rejection, dependency and safety
boundaries, lazy planning for unreadable stores, backup/audit preservation,
interrupted application outcomes, and final status/check/coverage readback.
