---
title: Branches that edit the same source file merge without coordinate conflicts
status: active
expects: success
tags:
  - symbols
  - coordinates
  - sync
  - staged
origin:
  kind: agent
  recorded_at: '2026-10-27T00:00:00.000Z'
id: SCEN-symbol-coordinates-derived-locally
type: scenario
---
Given a Kibi repository initialized with `kibi init`, when two branches edit the same source file (one moves every declaration down, the other edits a function body) and are merged, then the merge has no conflict in `.kb/`, `kibi sync` rebuilds the local coordinate cache with the moved line numbers and leaves `.kb/symbols.yaml` unchanged, and the pre-commit gates need nothing staged beyond the source edit. If a contributor force-stages the coordinate cache, `kibi check-generated --staged` rejects the commit; if a declaration is renamed without updating `.kb/symbols.yaml`, `kibi check --staged` names the uncovered and stale titles. A repository whose older schema committed the cache is untracked by `kibi migrate`.

The scenario ties REQ-symbol-coordinates-derived-locally to what a contributor sees when rebasing or merging parallel work. Before the change, any two branches that touched one source file conflicted on `.kb/symbol-coordinates.yaml`.