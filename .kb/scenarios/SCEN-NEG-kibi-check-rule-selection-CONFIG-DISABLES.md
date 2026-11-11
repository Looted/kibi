---
title: 'A legacy config that switches the context rule off does not stop a canonical violation'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-check-rule-selection-CONFIG-DISABLES
type: scenario
---
Given the same workspace plus a .kb/config.json that sets entity-context-missing to false and an accepted ADR with no context, when kibi check runs, then it exits nonzero with an entity-context-missing violation on ADR-NO-CONTEXT, while the advisory findings stay non-blocking.

This is the failure side of check rule selection. documentation/tests/e2e/packed/init-sync-check.test.ts, in its rule selection case, exercises it.
