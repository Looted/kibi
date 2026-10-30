---
title: A detached HEAD snapshot answer without the detached_head_read_only warning fails the consumer guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:46:55.534Z'
id: SCEN-CASE-branch-store-recovery-v4-snapshot-result-without-warning
type: scenario
---
Given a consumer workspace checked out at a commit no local branch points at, when kibi query, kibi search and kibi status answer from the read-only snapshot store, then each answer is checked for the detached_head_read_only warning naming the commit, the branches at HEAD and the store path, and an answer served without it fails the check.

The test case packages/cli/tests/consumer/detached-head.test.ts "answer query, search and status from a read-only snapshot of the checkout and refuse upsert" exercises it by asserting the warning on every snapshot answer. It covers the value past the bound of snapshot results without the warning, `gt 0`.