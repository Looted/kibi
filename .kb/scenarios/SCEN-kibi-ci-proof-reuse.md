---
title: 'The same snapshot reuses a successful proof across different SHAs'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-ci-proof-reuse
type: scenario
---
Given a successful develop proof for a canonical snapshot, when a pull request's merge commit has a different SHA but the same snapshot, then the reuse decision is reuse.

This is the success side of CI proof reuse. scripts/tests/ci-proof-reuse.test.ts, a step of TEST-kibi-verification-evidence-contract, exercises it.
