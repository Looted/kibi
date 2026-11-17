---
title: No new store keeps a file:// graph URI whose encoded name plus .trp.new exceeds 255 bytes
status: active
fact_kind: property_value
subject_key: kibi.core.store_graph_uri
property_key: file_uris_over_name_limit
operator: eq
value_type: int
value_int: 0
claim_text: A store keeps its file:// graph URI only while the percent-encoded name plus the longest suffix (`.trp.new`) fits
text_ref: REQ-core-journal-file-name-fits
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-core-journal-file-name-fits
origin:
  kind: agent
  recorded_at: '2026-11-17T06:03:34.800Z'
claim_key: CLAIM-91D495162C148E56
id: FACT-core-file-uri-kept-only-when-it-fits
type: fact
---
