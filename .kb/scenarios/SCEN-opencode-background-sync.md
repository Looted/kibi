---
id: SCEN-opencode-background-sync
title: OpenCode Background Sync Scheduling
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-opencode-background-sync.md
priority: must
tags:
  - opencode
  - sync
links:
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Scenario: Debounced Background Sync

**Given** a repository with Kibi enabled in OpenCode
**When** a relevant project file changes
**Then** the plugin must schedule a debounced background sync without blocking the main workflow
**And** failed scheduler setup must surface degraded maintenance state rather than crash the session.
