---
title: The kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT
status: active
fact_kind: property_value
subject_key: kibi.signoff_views.format
claim_key: CLAIM-1B36DD238864E38E
claim_text: The kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT
text_ref: REQ-kibi-signoff-format-setting
property_key: format_env
operator: eq
value_type: string
value_string: KIBI_SIGNOFF_FORMAT
origin:
  kind: agent
  recorded_at: '2026-10-28T11:16:33.070Z'
id: FACT-signoff-format-env
type: fact
---
SIGNOFF_FORMAT_ENV in packages/cli/src/commands/signoff.ts names the variable a host sets to choose the signoff view format instead of REQ-kibi-signoff-views' default unfenced Markdown. It is stated here so the name is proved against the constant.