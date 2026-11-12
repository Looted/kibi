---
title: 'The CLI must provide an idempotent migration path for branch KB schema changes, '
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.migration.schema_version
property_key: idempotent_schema_migration
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_cli_schema_migration.idempotent_schema_migration.eq.true
claim_key: CLAIM-E34E624D48A4327B
claim_text: The CLI must provide an idempotent migration path for branch KB schema changes, including dry-run preview, explicit application, audit metadata, compatibility remediation for legacy ontology data, and a non-mutating semantic-advisor backfill marker for existing requirement prose
id: FACT-PROP-REQ-CLI-SCHEMA-MIGRATION-C01
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
