---
title: kb_author_impact_review refuses an invalid record and keeps the existing file
status: active
expects: success
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-impact-review-author-strict
type: scenario
---
Given a written record, when kb_author_impact_review is called with a decision naming an unknown requirement, a no_impact decision without a rationale, an unknown path or a path twice, then each call fails with VALIDATION_FAILED and the file is unchanged.

The suites of TEST-impact-review-authoring exercise it.