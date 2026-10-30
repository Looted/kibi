---
title: Sync-related events without a structured log entry = 0
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: opencode.kibi_plugin
property_key: sync_events_without_structured_log
operator: eq
value_type: int
value_int: 0
polarity: require
canonical_key: opencode.kibi_plugin:sync_events_without_structured_log:eq:0
claim_key: CLAIM-AF3C20BC7F44053B
claim_text: The plugin must provide clear feedback about synchronization status:\n\nSurface structured logs and non-intrusive toasts for sync progress and completion.\nReport errors clearly without blocking the main OpenCode workflow.\nUse structured logging for all sync-related events to facilitate troubleshooting
id: FACT-PROP-REQ-OPENCODE-SYNC-FEEDBACK-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
