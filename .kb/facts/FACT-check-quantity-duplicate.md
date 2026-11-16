---
title: Kibi check must report two active value facts of current requirements that state one quantity under different subject or property keys
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:30.025Z'
subject_key: kibi.check.quantity_duplicate
property_key: quantity_duplicate_pairs_unreported
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-3BFD956863B01302
claim_text: Kibi check must report two active value facts of current requirements that state one quantity under different subject or property keys
text_ref: REQ-check-quantity-duplicate
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-check-quantity-duplicate
id: FACT-check-quantity-duplicate
type: fact
---
Counts pairs of active value facts of current requirements that state one quantity under different keys and that kibi check does not report; zero means each pair is a quantity-duplicate finding.