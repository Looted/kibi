---
title: Kibi check must not report a pair of value facts when either lists the other's subject and property under distinct_from
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:43.903Z'
subject_key: kibi.check.quantity_duplicate
property_key: declared_distinct_pairs_reported
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-E794733C1F130816
claim_text: Kibi check must not report a pair of value facts when either lists the other's subject and property under distinct_from
text_ref: REQ-check-quantity-duplicate-distinct-from
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-check-quantity-duplicate-distinct-from
id: FACT-check-quantity-duplicate-distinct-from
type: fact
---
Counts quantity-duplicate pairs reported although one fact lists the other's subject_key.property_key under distinct_from; zero means the declaration ends the finding.