---
title: A branch that moves during the merge is merged again
status: active
priority: should
expects: success
tags:
  - ci
  - merge
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:44.480Z'
id: SCEN-kb-merge-action-branch-moved
type: scenario
---
The author pushes a commit while the action runs its check; the first push is refused, the action fetches the new tip, merges again and pushes a merge whose first parent is the author's commit. When the branch moves on every attempt the action stops after the configured attempts and reports the branch as failed.