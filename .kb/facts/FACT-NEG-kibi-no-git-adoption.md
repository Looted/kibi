---
title: After git init, the knowledge recorded without Git is missing from the new branch
status: active
fact_kind: property_value
subject_key: kibi.no_git_adoption
property_key: unadopted_source_count
operator: eq
value_type: int
value_int: 2
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:21:18.736Z'
id: FACT-NEG-kibi-no-git-adoption
type: fact
---
After git init in a workspace Kibi used without Git, the first operation on the new branch compiles only what Git tracks, so the two sources recorded without Git are missing from the branch store. The failure-side scenario of REQ-kibi-no-git-store-adopted-on-git-init assumes this state and expects Kibi to reject it.
