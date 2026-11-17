---
title: The upgrade turns the rule on without listing the pairs
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T16:10:06.192Z'
id: SCEN-NEG-migrate-quantity-duplicate-review-UNLISTED
type: scenario
---
A KB moves to schema 19 and kibi check starts blocking pairs that kibi migrate never listed, so the person meets them as failures instead of a review list.

This is the failure side the rule must not produce; packages/cli/tests/consumer/quantity-duplicate.test.ts checks it.