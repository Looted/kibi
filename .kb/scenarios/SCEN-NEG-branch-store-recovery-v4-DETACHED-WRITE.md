---
title: An upsert on a detached HEAD without a single branch at HEAD is refused before anything is written
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:17:07.623Z'
id: SCEN-NEG-branch-store-recovery-v4-DETACHED-WRITE
type: scenario
---
Given a checkout detached at an older commit that no local branch points at, when kibi upsert is run, then the write is refused with a message naming git switch -c <branch> and KIBI_BRANCH, and no entity file or branch KB is touched.

This is the failure side of exact branch identity on a detached HEAD: reads may use a snapshot but writes must not guess a branch. packages/cli/tests/consumer/detached-head.test.ts "answer query, search and status from a read-only snapshot of the checkout and refuse upsert" exercises it.
