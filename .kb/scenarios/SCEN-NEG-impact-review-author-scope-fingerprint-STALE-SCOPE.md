---
title: 'Failure side: kb_author_impact_review refuses a changed staged scope'
status: active
expects: rejection
tags:
  - negative-path
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-NEG-impact-review-author-scope-fingerprint-STALE-SCOPE
type: scenario
---
Given the same call, a record written for the mismatched fingerprint fails the authoring tests' assertions.

## Context

The failure side of REQ-impact-review-author-scope-fingerprint.