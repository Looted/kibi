---
title: 'The staged check leaves the branch store and query results unchanged'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-staged-overlay-kb-BRANCH-STORE-WRITE
type: scenario
---
Given the same staged requirement, when kibi check --staged has run, then every file under .kb/branches is byte-identical to before and kibi query req does not list the staged requirement.

This is the failure side of the staged overlay. documentation/tests/e2e/packed/traceability-gate.test.ts, in its comment-only edit and overlay case, exercises it.
