---
title: A query shall return at most 32000 characters of an entity body
status: active
fact_kind: property_value
subject_key: kibi.operations.paging
claim_key: CLAIM-15878CC317A04D96
claim_text: A query shall return at most 32000 characters of an entity body
text_ref: REQ-kibi-operation-page-sizes
property_key: body_max_chars
operator: eq
value_type: int
value_int: 32000
origin:
  kind: agent
  recorded_at: '2026-10-28T17:16:36.159Z'
id: FACT-query-body-max-chars
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.