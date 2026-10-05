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
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.migration.schema6
  - authored_entity_without_origin
  - migration_origin_appended_other_bytes_unchanged
polarity: assert
canonical_key: logical_requirement_rule(kibi.migration.schema6,authored_entity_without_origin,migration_origin_appended_other_bytes_unchanged)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:24:59.054Z'
id: FACT-PRED-schema6-origin-backfill
type: fact
---
