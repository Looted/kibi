---
title: kb_author_impact_review refuses a changed staged scope
status: active
expects: success
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-impact-review-author-scope-fingerprint
type: scenario
---
Given a staged change, when kb_author_impact_review is called with a fingerprint other than the captured scope's, then it fails with VALIDATION_FAILED naming both fingerprints and writes no record.

The suites of TEST-impact-review-authoring exercise it.