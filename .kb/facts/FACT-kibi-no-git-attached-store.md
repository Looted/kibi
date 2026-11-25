---
title: Kibi must attach the knowledge store kibi-internal/no-git to every operation in a workspace outside any Git repository when KIBI_BRANCH is not set
status: active
fact_kind: property_value
subject_key: kibi.branch_attachment.outside_git
property_key: attached_store
operator: eq
value_type: string
value_string: kibi-internal/no-git
claim_key: CLAIM-E628892840EB7FAF
claim_text: Kibi must attach the knowledge store kibi-internal/no-git to every operation in a workspace outside any Git repository when KIBI_BRANCH is not set
text_ref: REQ-kibi-no-git-workspace-attaches-reserved-store
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:15:58.686Z'
id: FACT-kibi-no-git-attached-store
type: fact
---
