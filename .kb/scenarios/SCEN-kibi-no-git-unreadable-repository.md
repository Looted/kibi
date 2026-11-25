---
title: Kibi refuses a repository Git cannot read
status: active
expects: success
tags:
  - vcs
  - branching
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:16:39.832Z'
id: SCEN-kibi-no-git-unreadable-repository
type: scenario
---
Given a directory with a .git entry that Git does not accept, when kibi status runs as a JSON route or a CLI JSON route opens its runtime, then it fails with GIT_REPOSITORY_UNREADABLE, retryable false, with a message that says to run git status, and no kibi-internal/no-git store is created.
