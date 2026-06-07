---
id: REQ-opencode-background-sync
title: "OpenCode Background Sync"
status: open
created_at: 2026-05-13T00:00:00Z
source: packages/opencode/src/scheduler.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - sync
links:
  - type: specified_by
    target: SCEN-opencode-background-sync
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---

The plugin must maintain KB freshness via background synchronization:

1. Run sync in a debounced, non-blocking manner after relevant file edits.
2. Ensure the KB stays up to date without blocking the main user experience.
3. Debounce interval must be configurable via plugin settings.
4. Transition to `maintenanceDegraded` mode if the scheduler cannot be created or sync fails.
