---
title: The built-in claim similarity threshold shall be 0.75
status: active
fact_kind: property_value
subject_key: kibi.vocabulary_alignment.settings
claim_key: CLAIM-50F8B11033E58CB8
claim_text: The built-in claim similarity threshold shall be 0.75
text_ref: REQ-kibi-vocabulary-alignment-settings
property_key: claim_similarity_threshold
operator: eq
value_type: number
value_number: 0.75
origin:
  kind: agent
  recorded_at: '2026-10-28T10:44:39.204Z'
id: FACT-builtin-claim-similarity-threshold
type: fact
---
The built-in vocabulary alignment reuses a subject or a claim only above its thresholds, the Jev provider ranks a fixed number of subject candidates, an agent picks the new_subject choice to keep a new subject, and an external provider may run only for the operations on its allowlist (REQ-kibi-vocabulary-alignment-capability). Each value is stated here so it is proved against its constant.