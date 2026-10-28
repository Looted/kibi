---
title: The entity types that carry firmness shall be req and adr
status: active
fact_kind: property_value
subject_key: kibi.decision_firmness.settings
claim_key: CLAIM-1ACE983F105BF0F1
claim_text: The entity types that carry firmness shall be req and adr
text_ref: REQ-kb-decision-firmness-settings
property_key: firmness_types
operator: eq
value_type: set
value_set:
  - req
  - adr
origin:
  kind: agent
  recorded_at: '2026-10-28T10:33:01.035Z'
id: FACT-firmness-types
type: fact
---
packages/cli/src/decision-firmness.ts fixes the entity types REQ-kb-decision-firmness applies firmness to, the heading a superseding decision explains itself under and how long that explanation must be. They are stated here so each is proved against the constant; the violations Kibi reports stay in REQ-kb-decision-firmness.