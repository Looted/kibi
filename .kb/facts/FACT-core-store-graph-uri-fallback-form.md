---
title: 'The fallback store graph URI is urn:kibi:store: and a SHA-1 hex digest'
status: active
fact_kind: property_value
subject_key: kibi.core.store_graph_uri
property_key: fallback_uri
operator: matches
value_type: string
value_string: urn:kibi:store:[0-9a-f]{40}
claim_text: otherwise it uses `urn:kibi:store:<sha1 of the store directory>`
text_ref: REQ-core-journal-file-name-fits
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-core-journal-file-name-fits
origin:
  kind: agent
  recorded_at: '2026-11-17T06:03:36.017Z'
claim_key: CLAIM-AB3CE0209A0F4C4A
id: FACT-core-store-graph-uri-fallback-form
type: fact
---
