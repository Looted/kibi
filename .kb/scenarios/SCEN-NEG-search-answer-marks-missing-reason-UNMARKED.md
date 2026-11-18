---
title: A governing requirement with no reason is listed without saying so
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T10:20:57.175Z'
id: SCEN-NEG-search-answer-marks-missing-reason-UNMARKED
type: scenario
---
A requirement with no rationale field, no reason section and no linked ADR is listed as governing with no mark, so the agent cannot tell a missing reason from one it was not shown.

This is the failure side the answer must not produce; packages/cli/tests/search-answer.test.ts checks it.