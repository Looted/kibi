---
id: FACT-BRANCH-INITIALIZATION
title: Branch KB Initialization
status: superseded
created_at: 2026-02-20T14:40:00.000Z
updated_at: 2026-04-24T08:12:00.000Z
tags:
  - branching
  - initialization
  - legacy-policy
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: initialization_mode
operator: eq
value_type: string
value_string: automatic
polarity: require
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

When a branch KB is missing, initialization logic creates it automatically.
