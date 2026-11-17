---
title: A develop push reproves a merged train, or reuses a proof of other files
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: develop_push_reuses_merged_train_proof
operator: eq
value_type: bool
value_bool: false
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:52:24.313Z'
id: FACT-NEG-ci-proof-reuse-train-merge-VIOLATED
type: fact
---
A develop push that merged a proven train runs the full proof again, or a develop push reuses a train proof although its files differ from the train's, so develop is either proven twice or not proven at all.