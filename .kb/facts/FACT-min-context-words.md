---
title: The minimum context section length shall be 12 words
status: active
fact_kind: property_value
subject_key: kibi.entity_body.context
claim_key: CLAIM-3AE5FD48C8040C7C
claim_text: The minimum context section length shall be 12 words
text_ref: REQ-kb-entity-body-context-settings
property_key: min_context_words
operator: eq
value_type: int
value_int: 12
origin:
  kind: agent
  recorded_at: '2026-10-28T10:32:58.577Z'
id: FACT-min-context-words
type: fact
---
packages/cli/src/entity-body-context.ts is the one place that decides what body text counts as context for REQ-kb-entity-body-context: the entity types that must carry it, the headings whose sections hold it, the minimum length of a context section and the Jaccard similarity at which a section only restates the statement. They are stated here so each is proved against the constant; how the check reports a missing context stays in REQ-kb-entity-body-context.