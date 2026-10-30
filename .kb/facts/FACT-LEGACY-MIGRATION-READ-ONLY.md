---
id: FACT-LEGACY-MIGRATION-READ-ONLY
title: Migration batches remain review-only
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
tags:
  - lane:ontology
  - requirements
  - migration
  - safety
fact_kind: property_value
subject_key: kibi.migration.legacy_plan
property_key: preview_batches_not_read_only_reviewed_patch
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-783C35DFF9BFF1AF
claim_text: Every batch must be read-only, non-auto-applicable, and contain only a reviewed property-patch preview
claim_span_start: 1020
claim_span_end: 1122
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground count of preview batches that are writable, auto-applicable or more than a reviewed property-patch preview.
