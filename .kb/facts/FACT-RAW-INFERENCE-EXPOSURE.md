---
title: Raw inference is internal-only
status: active
text_ref: documentation/requirements/REQ-013.md
tags:
  - lane:ontology
  - strict-semantics
fact_kind: predicate
polarity: assert
predicate_namespace: kibi.domain
predicate_name: raw_inference_exposure
predicate_args:
  - kibi_inference
  - disabled
  - enabled
canonical_key: raw_inference_exposure(kibi_inference,disabled,enabled)
claim_key: CLAIM-FAF779E0E4FA5DEA
claim_text: 'The public MCP interface remains curated: exact lookup, curated discovery/reporting, mutation, and validation are allowed, while arbitrary inference predicates remain internal'
id: FACT-RAW-INFERENCE-EXPOSURE
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The public MCP interface remains curated: exact lookup, curated discovery/reporting, mutation, and validation are allowed, while arbitrary inference predicates remain internal.

