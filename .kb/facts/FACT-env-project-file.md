---
title: The Kibi project environment file shall be .env.kibi
status: active
fact_kind: property_value
subject_key: kibi.env_bootstrap.files
claim_key: CLAIM-34904BC7A1521580
claim_text: The Kibi project environment file shall be .env.kibi
text_ref: REQ-kibi-env-bootstrap-files
property_key: project_env_file
operator: eq
value_type: string
value_string: .env.kibi
origin:
  kind: agent
  recorded_at: '2026-10-28T10:40:33.174Z'
id: FACT-env-project-file
type: fact
---
packages/cli/src/env/bootstrap.ts names the files REQ-kibi-env-bootstrap loads before a command runs: the project file Kibi owns and the legacy shared file it still reads. They are stated here so each name is proved against the constant; precedence and resolver use stay in REQ-kibi-env-bootstrap.