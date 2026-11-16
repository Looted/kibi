---
title: Rejects Path Swipl Older Than 9 = true
status: active
fact_kind: property_value
subject_key: kibi.prolog.swipl_version
property_key: minimum_swipl_major
operator: gte
value_type: int
value_int: 9
canonical_key: kibi.prolog.swipl_version:minimum_swipl_major:gte:9
claim_key: CLAIM-7ED81CE5062FB889
claim_text: Kibi must reject a swipl on PATH older than version 9.0
claim_span_start: 321
claim_span_end: 376
text_ref: packages/cli/src/prolog/swipl-resolver.ts
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
id: FACT-prolog-bundled-rejects-path-swipl-older-than-9
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
