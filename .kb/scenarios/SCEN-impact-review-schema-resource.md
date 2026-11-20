---
title: The impact-review record schema is a kibi-commit-review skill resource
status: active
expects: success
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-impact-review-schema-resource
type: scenario
---
Given any staged change, when kb_prepare_impact_review runs, then authoring.schema names kibi-commit-review and resources/impact-review.schema.json, the result holds no schema, and the resource equals the shipped schema.

The suites of TEST-impact-review-compact-preparation exercise it.