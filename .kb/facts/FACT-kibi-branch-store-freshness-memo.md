---
title: Kibi must persist a stat-to-hash freshness memo in the gitignored branch store and record manifest byte hashes so tracked .kb/ source drift is detected without re-hashing unchanged files
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - cli
  - sync
  - freshness
fact_kind: property_value
subject_key: kibi.branch_store.freshness_memo
property_key: unmemoized_unchanged_file_rehashes
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-CF59FE661D9DA98C
claim_text: Kibi must persist a stat-to-hash freshness memo in the gitignored branch store and record manifest byte hashes so tracked .kb/ source drift is detected without re-hashing unchanged files
text_ref: REQ-kibi-persist-stat-hash-freshness-memo
origin:
  kind: agent
  recorded_at: '2026-11-23T10:44:12.177Z'
id: FACT-kibi-branch-store-freshness-memo
type: fact
---
Kibi must persist a stat-to-hash freshness memo in the gitignored branch store and record manifest byte hashes so tracked .kb/ source drift is detected without re-hashing unchanged files.