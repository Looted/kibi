---
id: SCEN-opencode-sync-feedback
title: OpenCode Sync Feedback Messaging
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
priority: must
tags:
  - opencode
  - sync
  - ux
links:
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Scenario: Sync Feedback

**Given** the plugin starts or completes a background sync
**When** it emits user-facing feedback
**Then** the feedback must use structured logs and non-blocking toasts
**And** failures must be reported clearly without blocking editing.
