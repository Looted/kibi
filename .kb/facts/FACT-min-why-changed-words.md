---
title: The minimum supersede explanation length shall be 12 words
status: active
fact_kind: property_value
subject_key: kibi.decision_firmness.settings
claim_key: CLAIM-18032217B0DD0A8E
claim_text: The minimum supersede explanation length shall be 12 words
text_ref: REQ-kb-decision-firmness-settings
property_key: min_why_changed_words
operator: eq
value_type: int
value_int: 12
origin:
  kind: agent
  recorded_at: '2026-10-28T10:33:02.711Z'
id: FACT-min-why-changed-words
type: fact
---
packages/cli/src/decision-firmness.ts fixes the entity types REQ-kb-decision-firmness applies firmness to, the heading a superseding decision explains itself under and how long that explanation must be. They are stated here so each is proved against the constant; the violations Kibi reports stay in REQ-kb-decision-firmness.