---
title: Kibi check must not compare boolean values, string values or the numbers 0 and 1 when it looks for one quantity stated twice
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:39.337Z'
subject_key: kibi.check.quantity_duplicate
property_key: trivial_values_compared
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-9ADE78F0A7402DC4
claim_text: Kibi check must not compare boolean values, string values or the numbers 0 and 1 when it looks for one quantity stated twice
text_ref: REQ-check-quantity-duplicate-trivial-values
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-check-quantity-duplicate-trivial-values
id: FACT-check-quantity-duplicate-trivial-values
type: fact
---
Counts quantity-duplicate pairs whose shared value is a boolean, a string, 0 or 1; zero means none is reported.