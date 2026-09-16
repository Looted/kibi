---
title: The plugin must maintain KB freshness via background synchronization:\n\nRun syn
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_opencode_background_sync
property_key: clause_01_the_plugin_must_maintain_kb_freshness_via_backgr
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_opencode_background_sync.clause_01_the_plugin_must_maintain_kb_freshness_via_backgr.eq.true
claim_key: CLAIM-B38ADF46F0A2215C
claim_text: The plugin must maintain KB freshness via background synchronization:\n\nRun sync in a debounced, non-blocking manner after relevant file edits.\nEnsure the KB stays up to date without blocking the main user experience.\nDebounce interval must be configurable via plugin settings.\nTransition to `maintenanceDegraded` mode if the scheduler cannot be created or sync fails
id: FACT-PROP-REQ-OPENCODE-BACKGROUND-SYNC-C01
type: fact
---
