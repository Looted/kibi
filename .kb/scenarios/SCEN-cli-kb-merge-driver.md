---
title: Merging branches that both appended Kibi symbols needs no hand resolution
status: active
tags:
  - cli
  - git
  - merge
id: SCEN-cli-kb-merge-driver
type: scenario
---
Given a repository whose `.gitattributes` routes `.kb/symbols.yaml` and `.kb/relationships/*.yaml` to `kibi merge-driver`, when two branches each append symbols and one merges the other, Git completes the merge with both branches' symbols and no conflict. When both branches change the same field of one symbol differently, the driver names the conflict, leaves conflict markers, and Git keeps the file unmerged.
