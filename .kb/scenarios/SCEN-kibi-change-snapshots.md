---
title: 'An unstaged edit leaves the staged snapshot tree unchanged'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-change-snapshots
type: scenario
---
Given a staged source file, when the file is edited in the working tree without staging and the installed CLI captures the staged snapshot again, then the snapshot tree is the same and its inventory does not contain the unstaged text; a revision diff between HEAD and HEAD has no changes.

This is the success side of change snapshots. documentation/tests/e2e/packed/impact-review-stage-e.test.ts, in its snapshot and analysis gate step, exercises it.
