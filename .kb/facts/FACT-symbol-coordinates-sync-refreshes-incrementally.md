---
title: Every kibi sync must refresh the symbol coordinate cache from source, re-extract only symbols whose source or identity changed, and leave .kb/symbols.yaml unchanged
status: active
fact_kind: property_value
subject_key: kibi.symbols.coordinate_cache
property_key: sync_refreshes_cache_incrementally
operator: eq
value_type: bool
value_bool: true
claim_text: Every kibi sync must refresh the symbol coordinate cache from source, re-extract only symbols whose source or identity changed, and leave .kb/symbols.yaml unchanged
claim_key: CLAIM-0589415A2EA2207F
text_ref: REQ-symbol-coordinates-derived-locally
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-10-27T00:00:00.000Z'
id: FACT-symbol-coordinates-sync-refreshes-incrementally
type: fact
---
