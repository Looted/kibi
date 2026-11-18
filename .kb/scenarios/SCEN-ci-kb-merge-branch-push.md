---
title: A feature branch push checks its own pull request
status: active
priority: should
expects: success
tags:
  - ci
  - merge
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:46.973Z'
id: SCEN-ci-kb-merge-branch-push
type: scenario
---
A push to develop runs the workflow with no branch filter, so every open pull request is checked; a push to any other branch passes that branch name to the action, which checks only that branch's pull request.