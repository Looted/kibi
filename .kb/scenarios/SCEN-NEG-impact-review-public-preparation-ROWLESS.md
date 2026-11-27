---
title: 'Failure side: a preparation lists every captured file'
status: active
expects: rejection
tags:
  - negative-path
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: SCEN-NEG-impact-review-public-preparation-ROWLESS
type: scenario
---
Given a staged scope of two files, a preparation whose rows leave one of them out fails the preparation tests' assertions.

## Context

The failure side of REQ-impact-review-public-preparation.