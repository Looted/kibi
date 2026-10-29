---
title: Taking the source lock from a live holder is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:00.269Z'
id: SCEN-NEG-bootstrap-apply-long-running-LIVE-LOCK-TAKEOVER
type: scenario
---
Given a workspace mutation lock held by a process that is still alive, when another writer tries to acquire the lock, then the attempt is refused with a message naming the holder pid and the lock file stays in place; a dead holder is only reclaimed with an explicit reclaim grant.

This is the failure side of lock safety for long bootstrap applies: a live writer must never be displaced. packages/cli/tests/operations/apply-plan-interrupted-recovery.test.ts "keeps the refusal while the holder is alive and without a reclaim grant" exercises it.
