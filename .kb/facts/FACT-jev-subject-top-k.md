---
title: The Jev vocabulary alignment shall rank at most 5 subject candidates
status: active
fact_kind: property_value
subject_key: kibi.vocabulary_alignment.settings
claim_key: CLAIM-C2B6CB8DA753C27B
claim_text: The Jev vocabulary alignment shall rank at most 5 subject candidates
text_ref: REQ-kibi-vocabulary-alignment-settings
property_key: jev_subject_top_k
operator: eq
value_type: int
value_int: 5
origin:
  kind: agent
  recorded_at: '2026-10-28T10:44:39.971Z'
id: FACT-jev-subject-top-k
type: fact
---
The built-in vocabulary alignment reuses a subject or a claim only above its thresholds, the Jev provider ranks a fixed number of subject candidates, an agent picks the new_subject choice to keep a new subject, and an external provider may run only for the operations on its allowlist (REQ-kibi-vocabulary-alignment-capability). Each value is stated here so it is proved against its constant.