---
title: Impact-review preparation pages its file rows within the result budget
status: active
expects: success
tags:
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-impact-review-preparation-paging
type: scenario
---
Given a staged scope of two files, when kb_prepare_impact_review is called with offset 1, then the page lists the second file with its requirements and obligations, and its fileCount and scope fingerprint are those of the whole scope.

The suites of TEST-impact-review-compact-preparation exercise it.