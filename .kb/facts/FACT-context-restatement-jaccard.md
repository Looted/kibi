---
title: The context restatement threshold shall be a Jaccard similarity of 0.8
status: active
fact_kind: property_value
subject_key: kibi.entity_body.context
claim_key: CLAIM-1D3F76DD5F69F22E
claim_text: The context restatement threshold shall be a Jaccard similarity of 0.8
text_ref: REQ-kb-entity-body-context-settings
property_key: context_restatement_jaccard
operator: eq
value_type: number
value_number: 0.8
origin:
  kind: agent
  recorded_at: '2026-10-28T10:38:05.220Z'
id: FACT-context-restatement-jaccard
type: fact
---
packages/cli/src/entity-body-context.ts is the one place that decides what body text counts as context for REQ-kb-entity-body-context: the entity types that must carry it, the headings whose sections hold it, the minimum length of a context section and the Jaccard similarity at which a section only restates the statement. They are stated here so each is proved against the constant; how the check reports a missing context stays in REQ-kb-entity-body-context.