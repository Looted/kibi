---
title: Repository hooks do not run for the merge
status: active
priority: should
expects: success
tags:
  - ci
  - merge
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:46.027Z'
id: SCEN-kb-merge-action-no-hooks
type: scenario
---
The checkout has failing pre-commit, commit-msg, pre-push and post-merge hooks; the action still commits and pushes the merge.