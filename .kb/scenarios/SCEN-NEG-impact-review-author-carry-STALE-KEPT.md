---
title: 'Failure side: kb_author_impact_review keeps only unchanged earlier decisions and reports those it drops'
status: active
expects: rejection
tags:
  - negative-path
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-NEG-impact-review-author-carry-STALE-KEPT
type: scenario
---
Given the same changes, a kept decision for the changed file or a drop not named in the result fails the authoring tests' assertions.

## Context

The failure side of REQ-impact-review-author-carry.