---
title: Only manifest-only conflicts are merged
status: active
priority: should
expects: success
tags:
  - ci
  - merge
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:42.916Z'
id: SCEN-kb-merge-action-manifest-only
type: scenario
---
A pull request whose only conflict is .kb/symbols.yaml gets a merge commit with both sides' records; one that also conflicts in README.md, and one whose manifest has the same field changed differently on both sides, are left at their old tips and listed as blocked.