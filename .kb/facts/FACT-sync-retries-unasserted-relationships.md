---
title: kibi sync must retry a front-matter relationship it could not assert on the next sync, even when only the relationship's target changed
status: active
fact_kind: property_value
subject_key: kibi.sync.relationships
property_key: retries_unasserted_front_matter_relationships
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-F2371320C4D36896
claim_text: kibi sync must retry a front-matter relationship it could not assert on the next sync, even when only the relationship's target changed
text_ref: REQ-sync-relationship-retry
origin:
  kind: agent
  recorded_at: '2026-11-03T11:20:42.008Z'
id: FACT-sync-retries-unasserted-relationships
type: fact
---
The end-to-end sync retry test checks this against the built CLI.