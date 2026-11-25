---
title: Outside Git, a Git feature is refused with a code instead of failing on Git
status: active
expects: rejection
tags:
  - negative-path
  - vcs
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:17:45.276Z'
id: SCEN-NEG-kibi-git-required
type: scenario
---
Given a directory outside any Git repository where a Git feature would fail as an unexplained OPERATION_FAILED, when it runs, then Kibi rejects it with GIT_REQUIRED, not retryable, before it runs any Git command.
