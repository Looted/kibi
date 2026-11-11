---
title: 'A changed snapshot requires a full proof run'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-ci-proof-reuse-CHANGED-SNAPSHOT
type: scenario
---
Given a successful develop proof, when the merge snapshot differs from the proven snapshot, or source changes land behind a new merge SHA, then the decision is to execute the full proof.

This is the failure side of CI proof reuse. scripts/tests/ci-proof-reuse.test.ts, a step of TEST-kibi-verification-evidence-contract, exercises it.
