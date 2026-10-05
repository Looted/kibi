---
title: A rerun after an applied schema 6 migration finds nothing to migrate
status: active
tags:
  - lane:ontology
  - migration
  - schema-6
claim_key: CLAIM-F143C7424AC5DBAF
claim_text: A kibi migrate run after an applied schema 6 migration must find nothing left to migrate
text_ref: .kb/requirements/REQ-kibi-schema6-migration.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.migration.schema6
  - rerun_after_applied_migration
  - nothing_left_to_migrate
polarity: assert
canonical_key: logical_requirement_rule(kibi.migration.schema6,rerun_after_applied_migration,nothing_left_to_migrate)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:25:18.124Z'
id: FACT-PRED-schema6-idempotent
type: fact
---
