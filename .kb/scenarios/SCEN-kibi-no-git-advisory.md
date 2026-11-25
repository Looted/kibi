---
title: An agent sets Kibi up and checks its status outside Git
status: active
expects: success
tags:
  - vcs
  - branching
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:19:28.359Z'
id: SCEN-kibi-no-git-advisory
type: scenario
---
Given a directory outside any Git repository, when an agent runs kibi init, kibi doctor and kibi status, then each succeeds: init prints the no_git_repository advisory, doctor reports the Git check as a warning carrying it, and the status result carries it as a diagnostic with git init and kibi init as the suggestion.
