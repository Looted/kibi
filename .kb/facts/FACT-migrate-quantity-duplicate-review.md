---
title: Kibi migrate must list each pair of value facts that state one quantity twice as a review action
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:10:02.498Z'
subject_key: kibi.check.quantity_duplicate
property_key: quantity_duplicate_pairs_unlisted
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-0C25598460520217
claim_text: Kibi migrate must list each pair of value facts that state one quantity twice as a review action
text_ref: REQ-migrate-quantity-duplicate-review
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-migrate-quantity-duplicate-review
id: FACT-migrate-quantity-duplicate-review
type: fact
---
Counts pairs that state one quantity twice on a KB upgraded to schema 19 that kibi migrate does not list as a quantity_duplicate_review action; zero means each is listed and nothing is written for it.