---
title: Telemetry records a working session outside Git
status: active
expects: success
tags:
  - vcs
  - branching
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:21:57.784Z'
id: SCEN-kibi-no-git-telemetry
type: scenario
---
Given telemetry turned on in a directory outside any Git repository, when kibi init succeeds, then its event has status success and vcs none with vcs_reason not_a_repository, and the refused kibi check --staged is a rejection with category git_required.
