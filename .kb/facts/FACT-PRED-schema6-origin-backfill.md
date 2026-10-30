---
title: Origin backfill appends a migration origin and leaves every other byte unchanged
status: active
tags:
  - lane:ontology
  - migration
  - schema-6
  - origin
claim_key: CLAIM-9DA50722C4A9B004
claim_text: kibi migrate must append a migration origin as the last frontmatter key of every authored entity without an origin and leave every other byte unchanged
text_ref: .kb/requirements/REQ-kibi-schema6-migration.md
fact_kind: property_value
subject_key: kibi.migration.schema6
property_key: authored_entities_not_original_bytes_plus_trailing_origin
operator: eq
value_type: int
value_int: 0
origin:
  kind: agent
  recorded_at: '2026-10-04T02:24:59.054Z'
id: FACT-PRED-schema6-origin-backfill
type: fact
---
