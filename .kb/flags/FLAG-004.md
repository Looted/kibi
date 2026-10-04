---
id: FLAG-004
title: "cross-repo-support: KB federation across multiple repositories"
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: could
tags:
  - federation
  - multi-repo
  - deferred
links:
  - REQ-001
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

When enabled: allows entities from a remote kibi KB to be referenced (read-only)
in the local KB. This is a runtime/config gate for cross-repository federation.
Supports monorepo-to-monorepo and cross-team traceability links.
