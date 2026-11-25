---
title: Outside Git, setup and status advise instead of failing
status: active
expects: rejection
tags:
  - negative-path
  - vcs
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:19:29.473Z'
id: SCEN-NEG-kibi-no-git-advisory
type: scenario
---
Given a directory outside any Git repository where kibi init, kibi doctor or status would fail, when they run, then Kibi rejects that outcome: they succeed and carry the no_git_repository advisory.
