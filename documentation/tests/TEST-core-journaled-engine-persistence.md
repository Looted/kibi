---
id: TEST-core-journaled-engine-persistence
title: Journal replay, rollback, migration, audit atomicity, and compaction
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
priority: must
tags: [core, persistence, migration]
links:
  - type: validates
    target: SCEN-core-journaled-engine-migration
  - type: validates
    target: REQ-core-journaled-engine-persistence
---

The persistence suite attaches a journaled branch, verifies journal replay after
detach/reattach, proves a failed RDF transaction rolls back both entity and
audit resources, forces compaction, and checks that generation metadata and
audit exports remain consistent. Migration fixtures cover populated legacy
stores, corrupt input, digest/count mismatch, and repeated attempts.
