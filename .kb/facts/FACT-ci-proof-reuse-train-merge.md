---
title: A develop push reuses the proof of the merged train with the same files
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: develop_push_reuses_merged_train_proof
operator: eq
value_type: bool
value_bool: true
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T11:52:21.475Z'
claim_key: CLAIM-DDD3A77B718BD347
claim_text: A develop push reuses the proof of the train whose merged files it has
id: FACT-ci-proof-reuse-train-merge
type: fact
---
True when a develop push whose commit merges a merge train head onto the previous develop tip skips the full proof and reuses the train pull request's successful proof, and does so only when that proof's attestation names the same head and base and the canonical Kibi snapshot of the pushed commit equals the attested one.