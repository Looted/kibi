---
title: 'A legacy config is used only to detect and plan the storage migration, and malformed JSON blocks it'
status: active
fact_kind: property_value
subject_key: kibi.kb.legacy_config
property_key: legacy_config_only_plans_migration
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-4E9C7220BB29F2A0
claim_text: 'Kibi must use a legacy .kb/config.json only to detect and plan the legacy storage migration, and must report malformed JSON as a migration blocker instead of guessing paths'
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: FACT-PROP-kibi-legacy-config-read-only-c01
type: fact
---
