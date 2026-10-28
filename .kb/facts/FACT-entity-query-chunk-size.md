---
title: An entity query shall load at most 25 entities per chunk
status: active
fact_kind: property_value
subject_key: kibi.operations.paging
claim_key: CLAIM-E8EE9A72FD5CF65D
claim_text: An entity query shall load at most 25 entities per chunk
text_ref: REQ-kibi-operation-page-sizes
property_key: entity_chunk_size
operator: eq
value_type: int
value_int: 25
origin:
  kind: agent
  recorded_at: '2026-10-28T17:16:33.857Z'
id: FACT-entity-query-chunk-size
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.