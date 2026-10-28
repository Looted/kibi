---
title: An external vocabulary alignment provider shall run only for kb_model_requirement
status: active
fact_kind: property_value
subject_key: kibi.vocabulary_alignment.settings
claim_key: CLAIM-F71286DA6318994F
claim_text: An external vocabulary alignment provider shall run only for kb_model_requirement
text_ref: REQ-kibi-vocabulary-alignment-settings
property_key: external_operations
operator: eq
value_type: set
value_set:
  - kb_model_requirement
origin:
  kind: agent
  recorded_at: '2026-10-28T10:44:41.605Z'
id: FACT-external-vocabulary-alignment-operations
type: fact
---
The built-in vocabulary alignment reuses a subject or a claim only above its thresholds, the Jev provider ranks a fixed number of subject candidates, an agent picks the new_subject choice to keep a new subject, and an external provider may run only for the operations on its allowlist (REQ-kibi-vocabulary-alignment-capability). Each value is stated here so it is proved against its constant.