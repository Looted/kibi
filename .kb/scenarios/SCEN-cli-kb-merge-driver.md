---
title: Merging branches that both appended Kibi symbols needs no hand resolution
status: active
tags:
  - cli
  - git
  - merge
id: SCEN-cli-kb-merge-driver
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Given a repository whose `.gitattributes` routes `.kb/symbols.yaml` and `.kb/relationships/*.yaml` to `kibi merge-driver`, when two branches each append symbols and one merges the other, Git completes the merge with both branches' symbols and no conflict. When both branches change the same field of one symbol differently, the driver names the conflict, leaves conflict markers, and Git keeps the file unmerged.
