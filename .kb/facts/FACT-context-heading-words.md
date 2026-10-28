---
title: The context section headings shall be context, rationale, why, background, source, notes and evidence
status: active
fact_kind: property_value
subject_key: kibi.entity_body.context
claim_key: CLAIM-07E2F041C92FF4E3
claim_text: The context section headings shall be context, rationale, why, background, source, notes and evidence
text_ref: REQ-kb-entity-body-context-settings
property_key: context_headings
operator: eq
value_type: set
value_set:
  - context
  - rationale
  - why
  - background
  - source
  - notes
  - evidence
origin:
  kind: agent
  recorded_at: '2026-10-28T10:32:57.759Z'
id: FACT-context-heading-words
type: fact
---
packages/cli/src/entity-body-context.ts is the one place that decides what body text counts as context for REQ-kb-entity-body-context: the entity types that must carry it, the headings whose sections hold it, the minimum length of a context section and the Jaccard similarity at which a section only restates the statement. They are stated here so each is proved against the constant; how the check reports a missing context stays in REQ-kb-entity-body-context.