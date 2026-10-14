---
title: In a commit that carries a kibi migrate run, the staged check must not count a symbol record as changed when it differs from its base only in fields the migration writes
status: active
fact_kind: property_value
subject_key: kibi.migration.first_commit
property_key: staged_check_counts_migration_only_record_edits
operator: eq
value_type: bool
value_bool: false
claim_text: In a commit that carries a kibi migrate run, the staged check must not count a symbol record as changed when it differs from its base only in fields the migration writes
text_ref: REQ-cli-migration-first-commit
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-10-14T08:44:52.828Z'
claim_key: CLAIM-FAECAC2314B4F934
id: FACT-cli-migration-only-records-unchanged
type: fact
---
