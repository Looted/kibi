---
title: An agent works with Kibi in a directory that is not a Git repository
status: active
expects: success
tags:
  - vcs
  - branching
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:16:05.581Z'
id: SCEN-kibi-no-git-attached-store
type: scenario
---
Given a directory outside any Git repository and no KIBI_BRANCH, when an agent runs kibi init and then kibi status, kibi upsert and kibi search in separate processes, then each succeeds on the same store, whose branch.json names kibi-internal/no-git, and kibi status reports that store as its branch.
