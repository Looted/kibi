---
title: A requirement's reason is a note saying where its text came from
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T17:36:41.001Z'
id: SCEN-NEG-requirement-reason-change-notes-QUOTED
type: scenario
---
A requirement split from a broader one has "Split from REQ-…, which held three behaviors" under Why this changed, and the answer or the Why line quotes that note as the requirement's reason.

This is the failure side the change must not produce; packages/cli/tests/search-answer.test.ts and packages/agent-core/tests/knowledge-index-contract.test.ts check it.