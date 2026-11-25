---
title: The schema 20 upgrade writes no Kibi level, so a project stays at test unless it sets remember
status: active
fact_kind: property_value
subject_key: kibi.level
property_key: level_writes_by_schema_20_upgrade
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-C775A286948D3B7A
claim_text: The schema 20 upgrade must leave the Kibi level as it is, so an existing project stays at test unless it sets remember
text_ref: packages/cli/src/commands/migrate.ts
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:16.267Z'
id: FACT-PROP-kibi-schema-20-level-c01
type: fact
---
The schema 20 upgrade writes no Kibi level, so a project stays at test unless it sets remember.
