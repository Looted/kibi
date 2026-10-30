---
title: The Jev model defaults to jev-latest
status: active
fact_kind: property_value
subject_key: kibi.plugin.jev
property_key: default_model
operator: eq
value_type: string
value_string: jev-latest
claim_key: CLAIM-8A4067501CAD35CE
claim_text: The Jev model must default to jev-latest
text_ref: REQ-capability-plugin-jev-defaults
origin:
  kind: agent
  recorded_at: '2026-10-28T09:36:38.056Z'
id: FACT-jev-default-model
type: fact
---
JEV_DEFAULT_MODEL in packages/plugin-jev/src/semantic-classifier.ts is the model the Jev classifier uses when none is configured.