---
title: A relationship whose type is not in the typed vocabulary is rejected and never stored
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:01:19.502Z'
id: SCEN-NEG-005-UNTYPED-RELATIONSHIP
type: scenario
---
Given an initialized knowledge base with a requirement and a scenario, when an upsert links them with a relationship type that is not one of the first-class relationship types, then the write fails with a validation error that lists the allowed types and the relationship is not stored.

This is the failure side of first-class typed relationships: an ad hoc link type must not enter the graph. documentation/tests/e2e/packed/schema-relationship-roundtrip.test.ts "rejects a relationship type outside the typed vocabulary" exercises it through the packed CLI upsert route.
