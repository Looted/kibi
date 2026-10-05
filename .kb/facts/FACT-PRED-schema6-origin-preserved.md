---
title: Origin backfill never overwrites an existing origin
status: active
tags:
  - lane:ontology
  - migration
  - schema-6
  - origin
claim_key: CLAIM-E242177CEDD37A68
claim_text: kibi migrate must never overwrite an existing origin
text_ref: .kb/requirements/REQ-kibi-schema6-migration.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.migration.schema6
  - entity_with_existing_origin
  - origin_never_overwritten
polarity: assert
canonical_key: logical_requirement_rule(kibi.migration.schema6,entity_with_existing_origin,origin_never_overwritten)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:25:01.485Z'
id: FACT-PRED-schema6-origin-preserved
type: fact
---
