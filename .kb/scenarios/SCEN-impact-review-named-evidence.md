---
title: Impact-review preparation returns full evidence only for named paths
status: active
expects: success
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-impact-review-named-evidence
type: scenario
---
Given a staged scope of two files, when kb_prepare_impact_review is called with paths naming one, then evidence holds that file's complete evidence and requirement context and the rows still list both.

The suites of TEST-impact-review-compact-preparation exercise it.