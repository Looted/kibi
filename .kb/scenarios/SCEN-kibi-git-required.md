---
title: An agent runs the commit gate and other Git features outside Git
status: active
expects: success
tags:
  - vcs
  - branching
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:17:44.088Z'
id: SCEN-kibi-git-required
type: scenario
---
Given a directory outside any Git repository with Kibi initialized, when an agent runs kibi check --staged, kibi gc, kibi check-diff, kibi hooks install or kb_prepare_impact_review, then each fails with GIT_REQUIRED, retryable false, and the message names the command to run instead, such as kibi check.
