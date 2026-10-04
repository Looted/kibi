---
id: SCEN-kibi-intent-aware-source-discovery
title: Search a project by functionality and trace results to source
status: active
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
tags: [search, intent, source, traceability]
links:
  - type: verified_by
    target: TEST-kibi-intent-aware-source-discovery
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

When an agent asks where a capability is implemented, Kibi returns ranked requirements and linked symbols with source locations and graph evidence. When no useful entity or source-linked match exists, Kibi returns an explicit zero-result outcome suitable for telemetry and follow-up discovery.
