---
title: Other requirements on a quantity a write changes
status: active
fact_kind: subject
subject_key: kibi.upsert.sibling_requirements
canonical_key: kibi.upsert.sibling_requirements
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
  - upsert
text_ref: packages/cli/src/operations/mutation/sibling-requirements.ts
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:27.530Z'
id: FACT-upsert-sibling-requirements-subject
type: fact
---
The current requirements that constrain the same quantity as a value fact kb_upsert writes: when the write is refused because two of them would contradict, how the accepted write and its dry run list them, and how kb_apply_plan checks a change to several of them at once. It is not the quantity-duplicate pairing on its own, which kibi check reads.