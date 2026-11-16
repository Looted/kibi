---
title: Kibi check must report a distinct_from entry on a value fact that names no active value fact
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:48.919Z'
subject_key: kibi.check.quantity_duplicate
property_key: dangling_distinct_from_entries_unreported
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-EAAFDB2C954FA1D7
claim_text: Kibi check must report a distinct_from entry on a value fact that names no active value fact
text_ref: REQ-check-quantity-duplicate-dangling-distinct
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-check-quantity-duplicate-dangling-distinct
id: FACT-check-quantity-duplicate-dangling-distinct
type: fact
---
Counts distinct_from entries on grounded value facts that name no active value fact's subject_key.property_key and that kibi check does not report; zero means each is a finding.