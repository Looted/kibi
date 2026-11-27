---
title: After git init, no source recorded without Git is left out
status: active
expects: rejection
tags:
  - negative-path
  - vcs
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:21:22.319Z'
id: SCEN-NEG-kibi-no-git-adoption
type: scenario
---
Given a workspace that got a repository after Kibi recorded knowledge without Git, where the new branch store would hold only what Git tracks, when the first Kibi operation runs on that branch, then Kibi rejects that outcome: every authored source on disk is compiled into the branch store.
