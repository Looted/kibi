---
title: 'Source proof kinds: Source proof readers must be one of json, yaml, glob, openapi, references, s'
status: active
fact_kind: property_value
subject_key: kibi.source_proof
property_key: source_reader
operator: eq
claim_key: CLAIM-80131AF672B06C75
claim_text: Source proof readers must be one of json, yaml, glob, openapi, references, schema, routes or validator
text_ref: REQ-kibi-source-proof-reader-vocabulary
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kibi-source-proof-kinds
value_type: set
value_set:
  - glob
  - json
  - openapi
  - references
  - routes
  - schema
  - validator
  - yaml
origin:
  kind: agent
  recorded_at: '2026-10-26T17:38:38.819Z'
id: FACT-kibi-source-proof-readers
type: fact
---
