---
title: Fork pull requests are skipped
status: active
priority: should
expects: success
tags:
  - ci
  - merge
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:45.221Z'
id: SCEN-kb-merge-action-skip-forks
type: scenario
---
Among the open pull requests one comes from a fork; the action names it as skipped and merges only the same-repository pull request.