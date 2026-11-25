---
title: Outside Git, kibi sync does not wait for a receipt
status: active
expects: rejection
tags:
  - negative-path
  - vcs
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:17:08.846Z'
id: SCEN-NEG-kibi-no-git-sources-on-disk
type: scenario
---
Given a directory outside any Git repository with a hand-written .kb source that no receipt vouches for, where sync would leave it out, when kibi sync runs, then Kibi rejects that outcome: it compiles the source and writes no receipt.
