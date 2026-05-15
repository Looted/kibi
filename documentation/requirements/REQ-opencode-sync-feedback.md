---
id: REQ-opencode-sync-feedback
title: "OpenCode Sync Feedback"
status: open
created_at: 2026-05-13T00:00:00Z
source: packages/opencode/src/toast.ts
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - ux
links:
  - type: specified_by
    target: SCEN-opencode-sync-feedback
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
---

The plugin must provide clear feedback about synchronization status:

1. Surface structured logs and non-intrusive toasts for sync progress and completion.
2. Report errors clearly without blocking the main OpenCode workflow.
3. Use structured logging for all sync-related events to facilitate troubleshooting.
