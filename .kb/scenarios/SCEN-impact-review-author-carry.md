---
title: kb_author_impact_review keeps only unchanged earlier decisions and reports those it drops
status: active
expects: success
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-impact-review-author-carry
type: scenario
---
Given a record for two staged files, when one file changes and kb_author_impact_review is called with only that file's decision, then the other decision is kept; when a file leaves the scope its decision is listed as dropped, and when a decided file changes and is left undecided the refusal names it.

The suites of TEST-impact-review-authoring exercise it.