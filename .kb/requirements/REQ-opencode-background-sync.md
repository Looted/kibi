---
id: REQ-opencode-background-sync
title: OpenCode Background Sync
status: open
created_at: 2026-05-13T00:00:00.000Z
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
semantic_text: The plugin must maintain KB freshness via background synchronization:\n\nRun sync in a debounced, non-blocking manner after relevant file edits.\nEnsure the KB stays up to date without blocking the main user experience.\nDebounce interval must be configurable via plugin settings.\nTransition to `maintenanceDegraded` mode if the scheduler cannot be created or sync fails.
logic_claims:
  - CLAIM-B38ADF46F0A2215C
semantic_clauses:
  - The plugin must maintain KB freshness via background synchronization:\n\nRun sync in a debounced, non-blocking manner after relevant file edits.\nEnsure the KB stays up to date without blocking the main user experience.\nDebounce interval must be configurable via plugin settings.\nTransition to `maintenanceDegraded` mode if the scheduler cannot be created or sync fails
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8d440aab24f5a50530137d4dcbc6dfec7a2c3bd2ce18dc38755b9464047fd14c
semantic_inventory:
  - claim_key: CLAIM-B38ADF46F0A2215C
    claim_text: The plugin must maintain KB freshness via background synchronization:\n\nRun sync in a debounced, non-blocking manner after relevant file edits.\nEnsure the KB stays up to date without blocking the main user experience.\nDebounce interval must be configurable via plugin settings.\nTransition to `maintenanceDegraded` mode if the scheduler cannot be created or sync fails
    role: normative
    status: modeled
    span:
      start: 0
      end: 371
type: req
---

The plugin must maintain KB freshness via background synchronization:

1. Run sync in a debounced, non-blocking manner after relevant file edits.
2. Ensure the KB stays up to date without blocking the main user experience.
3. Debounce interval must be configurable via plugin settings.
4. Transition to `maintenanceDegraded` mode if the scheduler cannot be created or sync fails.
