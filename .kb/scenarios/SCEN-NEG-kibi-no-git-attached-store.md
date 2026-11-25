---
title: Outside Git, Kibi never attaches a store named after a default branch
status: active
expects: rejection
tags:
  - negative-path
  - vcs
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:16:06.759Z'
id: SCEN-NEG-kibi-no-git-attached-store
type: scenario
---
Given a directory outside any Git repository where an operation would attach a store named after a default branch such as main, when kibi init, kibi status or an MCP tool runs without KIBI_BRANCH, then Kibi rejects that attachment: the store it attaches is kibi-internal/no-git, and KIBI_BRANCH naming the reserved kibi-internal/ namespace is refused.
