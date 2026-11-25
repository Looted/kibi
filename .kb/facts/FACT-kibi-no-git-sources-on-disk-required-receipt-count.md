---
title: In a workspace outside any Git repository, kibi sync must compile the authored .kb sources on disk without requiring a pending-source receipt for any of them
status: active
fact_kind: property_value
subject_key: kibi.source_inventory.outside_git
property_key: required_receipt_count
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-9144F9E2119B1B5E
claim_text: In a workspace outside any Git repository, kibi sync must compile the authored .kb sources on disk without requiring a pending-source receipt for any of them
text_ref: REQ-kibi-no-git-compiles-sources-on-disk
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:17:02.479Z'
id: FACT-kibi-no-git-sources-on-disk-required-receipt-count
type: fact
---
