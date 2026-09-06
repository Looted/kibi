---
id: REQ-opencode-sync-feedback
title: OpenCode Sync Feedback
status: open
created_at: 2026-05-13T00:00:00.000Z
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
semantic_text: The plugin must provide clear feedback about synchronization status:\n\nSurface structured logs and non-intrusive toasts for sync progress and completion.\nReport errors clearly without blocking the main OpenCode workflow.\nUse structured logging for all sync-related events to facilitate troubleshooting.
logic_claims:
  - CLAIM-AF3C20BC7F44053B
semantic_clauses:
  - The plugin must provide clear feedback about synchronization status:\n\nSurface structured logs and non-intrusive toasts for sync progress and completion.\nReport errors clearly without blocking the main OpenCode workflow.\nUse structured logging for all sync-related events to facilitate troubleshooting
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1bc1024eebfabf86b389a8a10e2ca55fadb8f3d32faced11985d91e719eaa9ea
semantic_inventory:
  - claim_key: CLAIM-AF3C20BC7F44053B
    claim_text: The plugin must provide clear feedback about synchronization status:\n\nSurface structured logs and non-intrusive toasts for sync progress and completion.\nReport errors clearly without blocking the main OpenCode workflow.\nUse structured logging for all sync-related events to facilitate troubleshooting
    role: normative
    status: modeled
    span:
      start: 0
      end: 304
type: req
---

The plugin must provide clear feedback about synchronization status:

1. Surface structured logs and non-intrusive toasts for sync progress and completion.
2. Report errors clearly without blocking the main OpenCode workflow.
3. Use structured logging for all sync-related events to facilitate troubleshooting.
