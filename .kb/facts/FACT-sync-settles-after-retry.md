---
title: kibi sync must report no changes on the run after a retried relationship is asserted when no source changed
status: active
fact_kind: property_value
subject_key: kibi.sync.relationships
property_key: reports_no_changes_after_retry
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-65EA216B5E3DE047
claim_text: kibi sync must report no changes on the run after a retried relationship is asserted when no source changed
text_ref: REQ-sync-relationship-retry
origin:
  kind: agent
  recorded_at: '2026-11-03T11:20:43.196Z'
id: FACT-sync-settles-after-retry
type: fact
---
The end-to-end sync retry test checks this against the built CLI.