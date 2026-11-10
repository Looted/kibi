---
title: A failed engine transaction rolls back its entity and audit writes together
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T12:00:00.000Z'
id: SCEN-NEG-kibi-engine-durable-transactions-PARTIAL-COMMIT
type: scenario
---
Given a running engine for one workspace and branch, when a batch asserts a requirement and then fails, then the batch reports failure, the requirement is not served by an indexed read, and the exported audit log does not name it, while an earlier committed upsert stays in both.

This is the failure side of durable RDF transactions. packages/cli/tests/engine.test.ts "serves typed indexed reads and rolls back entity and audit writes together" exercises it, inside the TEST-core-journaled-engine-persistence proof run.
