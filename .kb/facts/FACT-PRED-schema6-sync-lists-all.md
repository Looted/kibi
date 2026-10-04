---
title: Sync names every failing requirement in one error pointing to kibi migrate
status: active
tags:
  - lane:ontology
  - migration
  - schema-6
  - sync
claim_key: CLAIM-3CE79E9EEB832118
claim_text: kibi sync must check every requirement before failing proposition-complete ingestion and name every failing requirement in one error that points to kibi migrate
text_ref: .kb/requirements/REQ-kibi-schema6-migration.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.migration.schema6
  - proposition_complete_ingestion_failures
  - all_failures_in_one_error_pointing_to_migrate
polarity: assert
canonical_key: logical_requirement_rule(kibi.migration.schema6,proposition_complete_ingestion_failures,all_failures_in_one_error_pointing_to_migrate)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:25:15.752Z'
id: FACT-PRED-schema6-sync-lists-all
type: fact
---
