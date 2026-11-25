---
title: Outside Git, an operation attaches a store named after a default branch (main)
status: active
fact_kind: property_value
subject_key: kibi.branch_attachment.outside_git
property_key: attached_store
operator: eq
value_type: string
value_string: main
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:16:02.906Z'
id: FACT-NEG-kibi-no-git-attached-store
type: fact
---
A workspace outside any Git repository is attached to a store named after a default branch such as main, the way the KIBI_BRANCH workaround attached it, so the knowledge silently follows whatever name the last process used. The failure-side scenario of REQ-kibi-no-git-workspace-attaches-reserved-store assumes this state and expects Kibi to reject it.
