---
title: The first Kibi operation on a Git branch that has no store, in a workspace with a kibi-internal/no-git store, must leave no authored .kb source on disk out of the branch store
status: active
fact_kind: property_value
subject_key: kibi.no_git_adoption
property_key: unadopted_source_count
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-D570E5AFCA2D40D9
claim_text: The first Kibi operation on a Git branch that has no store, in a workspace with a kibi-internal/no-git store, must leave no authored .kb source on disk out of the branch store
text_ref: REQ-kibi-no-git-store-adopted-on-git-init
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:21:13.910Z'
id: FACT-kibi-no-git-adoption-unadopted-source-count
type: fact
---
