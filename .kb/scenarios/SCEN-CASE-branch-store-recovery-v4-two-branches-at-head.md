---
title: A detached HEAD with two local branches at HEAD attaches neither branch KB and refuses upsert
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:47:04.736Z'
id: SCEN-CASE-branch-store-recovery-v4-two-branches-at-head
type: scenario
---
Given a consumer workspace whose commit is pointed at by both main and release, checked out detached, when kibi query runs, then it answers from the read-only snapshot store with a detached_head_read_only warning listing both branches, and when kibi upsert runs it is refused with a message naming 'git switch main' (or another branch at HEAD) and no scenario file is written.

The test case packages/cli/tests/consumer/detached-head.test.ts "do not choose between two local branches at HEAD: reads use the snapshot and upsert is refused" exercises it. It covers the many class past the bound of local branches at HEAD for attach, `gt 1`.