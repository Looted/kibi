---
title: A migration plan must not plan branch store recovery for a store whose only damage is an unmigrated legacy store
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: recovery_planned_for_unmigrated_legacy_store
operator: eq
value_type: bool
value_bool: false
tags:
  - lane:strict
  - fact:property_value
  - branching
  - migration
claim_text: A migration plan must not plan branch store recovery for a store whose only damage is an unmigrated legacy store
text_ref: REQ-kibi-legacy-attachment-engine-refusal
origin:
  kind: agent
  recorded_at: '2026-11-16T20:43:58.593Z'
claim_key: CLAIM-A6EEF56E53B8EECA
id: FACT-kibi-legacy-store-not-recovered
type: fact
---
A migration plan must not plan branch store recovery for a store whose only damage is an unmigrated legacy store. Grounds a clause of REQ-kibi-legacy-attachment-engine-refusal.