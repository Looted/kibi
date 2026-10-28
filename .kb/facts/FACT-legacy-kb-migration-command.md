---
title: The legacy KB migration command shall be kibi migrate --yes
status: active
fact_kind: property_value
subject_key: kibi.legacy_kb.migration
claim_key: CLAIM-B6CB9B3266E2A0A1
claim_text: The legacy KB migration command shall be kibi migrate --yes
text_ref: REQ-legacy-kb-migrate-command
property_key: migration_command
operator: eq
value_type: string
value_string: kibi migrate --yes
origin:
  kind: agent
  recorded_at: '2026-10-28T11:15:39.655Z'
id: FACT-legacy-kb-migration-command
type: fact
---
LEGACY_KB_MIGRATION_COMMAND in packages/cli/src/utils/config.ts is the command REQ-legacy-kb-first-step-migrate has every surface name first when it finds a legacy KB. It is stated here so the exact command is proved against the constant.