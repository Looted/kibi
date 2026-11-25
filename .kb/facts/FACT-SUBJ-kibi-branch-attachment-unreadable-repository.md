---
title: Kibi branch attachment where a .git entry exists that Git cannot read
status: active
fact_kind: subject
subject_key: kibi.branch_attachment.unreadable_repository
tags:
  - vcs
  - branching
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:15:30.970Z'
id: FACT-SUBJ-kibi-branch-attachment-unreadable-repository
type: fact
---
What Kibi answers in a workspace where a .git entry exists at or above the root but Git refuses it or cannot read it (ownership, permissions, a broken .git file, a .git entry without a usable Git).
