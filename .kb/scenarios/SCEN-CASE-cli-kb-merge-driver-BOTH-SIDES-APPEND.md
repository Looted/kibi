---
title: A git merge where both branches appended symbols keeps both added records
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:34.115Z'
id: SCEN-CASE-cli-kb-merge-driver-BOTH-SIDES-APPEND
type: scenario
---
Given a repository that routes .kb/symbols.yaml through kibi merge-driver and two branches that each appended a different symbol at the end of the manifest, which a line merge would turn into a conflict, when one branch merges the other, then the merge succeeds and the manifest holds the base symbol and both added symbols.

This covers the edge case of a record added on one side being dropped, the value past the bound `gt 0`. packages/cli/tests/commands/merge-driver.test.ts "resolves a git merge where both branches appended symbols" exercises it through a real git merge.
