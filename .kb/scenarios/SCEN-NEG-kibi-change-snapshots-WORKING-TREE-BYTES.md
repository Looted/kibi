---
title: 'An index change after capture and an unresolved revision are refused'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-change-snapshots-WORKING-TREE-BYTES
type: scenario
---
Given a captured staged snapshot, when the edit is then staged, then the snapshot's unchanged check fails with "Git index or HEAD changed during staged analysis"; and a revision diff whose head revision does not resolve is refused.

This is the failure side of change snapshots. documentation/tests/e2e/packed/impact-review-stage-e.test.ts, in its snapshot and analysis gate step, exercises it.
