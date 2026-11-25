---
title: Outside Git, a working operation is not recorded as a rejection
status: active
expects: rejection
tags:
  - negative-path
  - vcs
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:21:58.972Z'
id: SCEN-NEG-kibi-no-git-telemetry
type: scenario
---
Given a directory outside any Git repository where telemetry would record a working kibi init as rejected, when it runs, then Kibi rejects that record: the event says success with vcs none.
