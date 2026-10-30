---
title: A sync cache entry shall live at most 2592000000 milliseconds
status: active
fact_kind: property_value
subject_key: kibi.ingestion.inventory
claim_key: CLAIM-656E6AB2DED99BD6
claim_text: A sync cache entry shall live at most 2592000000 milliseconds
text_ref: REQ-ingestion-inventory-settings
property_key: cache_ttl_ms
operator: eq
value_type: int
value_int: 2592000000
origin:
  kind: agent
  recorded_at: '2026-10-28T19:05:12.408Z'
id: FACT-sync-cache-ttl
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.