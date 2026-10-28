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
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.