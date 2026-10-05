---
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.migration.schema6
  - rerun_after_applied_migration
  - nothing_left_to_migrate
polarity: assert
status: active
title: A kibi migrate run after an applied schema 7 migration must find nothing left to migrate
claim_key: CLAIM-81CA6DAF832B824E
claim_text: A kibi migrate run after an applied schema 7 migration must find nothing left to migrate
text_ref: .kb/requirements/REQ-kibi-schema6-migration-v2.md
tags:
  - migration
  - schema-7
  - lane:ontology
canonical_key: logical_requirement_rule(kibi.migration.schema6,rerun_after_applied_migration,nothing_left_to_migrate)
origin:
  kind: agent
  recorded_at: '2026-10-04T17:32:23.077Z'
id: FACT-migration-schema7-idempotent
type: fact
---
