---
title: kb_author_impact_review stages, decides and proves nothing itself
status: active
expects: success
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-impact-review-author-no-generation
type: scenario
---
Given a staged change, when kb_author_impact_review writes the record, then the Git index does not hold it, the result reports staged false, and every decision in it was sent or kept from the earlier record.

The suites of TEST-impact-review-authoring exercise it.