---
id: FACT-LEGACY-MIGRATION-SOURCE-BOUND
title: Preview propositions bind to exact authored source
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - migration
  - source-binding
fact_kind: property_value
subject_key: kibi.migration.legacy_plan
property_key: preview_propositions_without_exact_source_binding
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-06AF50DD30B2936E
claim_text: Each preview batch must reconstruct the normalized authored Markdown body and bind every proposition to an exact SHA-256 source hash and UTF-8 span
claim_span_start: 233
claim_span_end: 380
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground count of preview propositions that lack an exact source hash and UTF-8 span.
