---
title: One quantity stated under two keys
status: active
fact_kind: subject
subject_key: kibi.check.quantity_duplicate
canonical_key: kibi.check.quantity_duplicate
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
  - check
text_ref: packages/cli/src/public/operations/quantity-layer.ts
origin:
  kind: agent
  recorded_at: '2026-11-16T16:09:28.191Z'
id: FACT-check-quantity-duplicate-subject
type: fact
---
Pairs of active value facts, grounded by current requirements, that state one quantity under different subject or property keys: how kibi check reports them, how kb_upsert warns about them and how kibi migrate lists them for review. It is not two facts on one key, which the subject-key-identity rule reads.