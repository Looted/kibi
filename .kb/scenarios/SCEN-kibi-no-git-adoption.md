---
title: An agent runs git init in a workspace it used without Git
status: active
expects: success
tags:
  - vcs
  - branching
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:21:21.104Z'
id: SCEN-kibi-no-git-adoption
type: scenario
---
Given a directory where Kibi recorded a requirement through kibi upsert and another by hand without Git, when the agent runs git init and then kibi search, then both requirements are found on the new branch, the result carries no_git_store_adopted once, the no-Git store is kept under .kb/recovery/no-git-adoption, and kibi init then installs the hooks.
