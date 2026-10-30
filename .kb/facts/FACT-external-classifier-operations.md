---
title: An external semantic classifier shall load only for kb_semantic_advisor or kb_compile_intent
status: active
fact_kind: property_value
subject_key: kibi.capability_plugins.vocabulary
claim_key: CLAIM-C22A6481F799BDA3
claim_text: An external semantic classifier shall load only for kb_semantic_advisor or kb_compile_intent
text_ref: REQ-capability-plugin-vocabulary
property_key: classifier_operations
operator: eq
value_type: set
value_set:
  - kb_semantic_advisor
  - kb_compile_intent
origin:
  kind: agent
  recorded_at: '2026-10-29T10:28:59.186Z'
id: FACT-external-classifier-operations
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.