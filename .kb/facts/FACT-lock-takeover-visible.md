---
title: A store lock takeover shall stay visible for 86400000 milliseconds
status: active
fact_kind: property_value
subject_key: kibi.branch_store.settings
claim_key: CLAIM-68F4FC02E5AEE4E4
claim_text: A store lock takeover shall stay visible for 86400000 milliseconds
text_ref: REQ-branch-store-settings
property_key: takeover_visible_ms
operator: eq
value_type: int
value_int: 86400000
origin:
  kind: agent
  recorded_at: '2026-10-28T20:42:16.726Z'
id: FACT-lock-takeover-visible
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.