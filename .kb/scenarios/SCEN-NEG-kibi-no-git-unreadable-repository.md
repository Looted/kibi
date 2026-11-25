---
title: Kibi never treats a repository Git cannot read as a workspace without Git
status: active
expects: rejection
tags:
  - negative-path
  - vcs
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:16:41.592Z'
id: SCEN-NEG-kibi-no-git-unreadable-repository
type: scenario
---
Given a directory with a .git entry that Git cannot read, where an operation would be answered from a no-Git store, when any Kibi operation runs, then Kibi rejects the workspace with GIT_REPOSITORY_UNREADABLE instead and writes no store.
