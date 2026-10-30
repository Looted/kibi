---
title: A claim without a component is reported instead of being written with a malformed key
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:05.597Z'
id: SCEN-NEG-bootstrap-subject-key-shape-COMPONENTLESS-CLAIM
type: scenario
---
Given an intent claim whose multi-word subject names no component and whose source declares none, when bootstrap plans it, then no candidate is planned, the claim is kept as a source-only signal and the diagnostics name it and the missing component.

This is the failure side of component-first subject keys: a claim must not be written under a malformed key. packages/cli/tests/operations/bootstrap-subject-key-shape.test.ts "without a component the claim is reported, not written with a malformed key" exercises it.
