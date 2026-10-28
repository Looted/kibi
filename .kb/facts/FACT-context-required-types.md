---
title: The entity types that must carry body context shall be req, scenario, test, adr and fact
status: active
fact_kind: property_value
subject_key: kibi.entity_body.context
claim_key: CLAIM-F79D10EECC5C5800
claim_text: The entity types that must carry body context shall be req, scenario, test, adr and fact
text_ref: REQ-kb-entity-body-context-settings
property_key: context_required_types
operator: eq
value_type: set
value_set:
  - req
  - scenario
  - test
  - adr
  - fact
origin:
  kind: agent
  recorded_at: '2026-10-28T10:32:56.955Z'
id: FACT-context-required-types
type: fact
---
packages/cli/src/entity-body-context.ts is the one place that decides what body text counts as context for REQ-kb-entity-body-context: the entity types that must carry it, the headings whose sections hold it, the minimum length of a context section and the Jaccard similarity at which a section only restates the statement. They are stated here so each is proved against the constant; how the check reports a missing context stays in REQ-kb-entity-body-context.