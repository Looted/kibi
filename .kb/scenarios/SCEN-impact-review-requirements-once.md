---
title: Impact-review preparation lists each requirement once
status: active
expects: success
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-impact-review-requirements-once
type: scenario
---
Given two staged files that implement the same requirement, when kb_prepare_impact_review runs, then requirements lists that requirement once with its before and after fingerprints and both rows name its id.

The suites of TEST-impact-review-compact-preparation exercise it.