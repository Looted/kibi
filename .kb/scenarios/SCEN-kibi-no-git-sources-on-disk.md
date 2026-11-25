---
title: An agent writes a .kb source by hand outside Git and syncs
status: active
expects: success
tags:
  - vcs
  - branching
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:17:07.652Z'
id: SCEN-kibi-no-git-sources-on-disk
type: scenario
---
Given a directory outside any Git repository with Kibi initialized, when a .kb requirement is written by hand and kibi sync runs, then sync exits 0, a search finds the requirement, and no pending-source receipt exists.
