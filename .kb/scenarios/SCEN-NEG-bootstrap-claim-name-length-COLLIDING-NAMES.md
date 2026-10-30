---
title: Two claims whose shortened names collide get distinct keys instead of sharing one
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:49.448Z'
id: SCEN-NEG-bootstrap-claim-name-length-COLLIDING-NAMES
type: scenario
---
Given two claims about different subjects whose shortened generated names would be identical, when bootstrap plans them, then the second claim gets a third key segment so the two keys differ, and the plan reports the disambiguation.

This is the failure side of distinct claim names: a name collision must not merge two different claims. packages/cli/tests/operations/bootstrap-claim-name-length.test.ts "different subjects that shorten to one key get a third segment instead of colliding" exercises it.
