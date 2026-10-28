---
title: The legacy Kibi environment file shall be .env
status: active
fact_kind: property_value
subject_key: kibi.env_bootstrap.files
claim_key: CLAIM-1F71DA2071DB7162
claim_text: The legacy Kibi environment file shall be .env
text_ref: REQ-kibi-env-bootstrap-files
property_key: legacy_env_file
operator: eq
value_type: string
value_string: .env
origin:
  kind: agent
  recorded_at: '2026-10-28T10:40:33.980Z'
id: FACT-env-legacy-file
type: fact
---
packages/cli/src/env/bootstrap.ts names the files REQ-kibi-env-bootstrap loads before a command runs: the project file Kibi owns and the legacy shared file it still reads. They are stated here so each name is proved against the constant; precedence and resolver use stay in REQ-kibi-env-bootstrap.