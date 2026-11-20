---
title: kb_author_impact_review writes the record from the reviewer's decisions and Kibi's evidence
status: active
expects: success
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-impact-review-author-write
type: scenario
---
Given a staged change and a decision for each file, when kb_author_impact_review runs with the scope fingerprint, then .kibi/impact-review.json holds a strictly valid record with those decisions, the reviewer id and review time, and the captured evidence.

The suites of TEST-impact-review-authoring exercise it.