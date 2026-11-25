---
title: Outside Git, a hand-written .kb source needs a pending-source receipt before kibi sync compiles it
status: active
fact_kind: property_value
subject_key: kibi.source_inventory.outside_git
property_key: required_receipt_count
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:17:05.117Z'
id: FACT-NEG-kibi-no-git-sources-on-disk
type: fact
---
A .kb source written by hand in a workspace outside any Git repository is left out of the store until one pending-source receipt vouches for it, so the knowledge base looks empty to the agent that wrote it. The failure-side scenario of REQ-kibi-no-git-compiles-sources-on-disk assumes this state and expects Kibi to reject it.
