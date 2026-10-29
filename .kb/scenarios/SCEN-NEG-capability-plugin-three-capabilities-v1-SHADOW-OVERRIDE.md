---
title: A shadow classifier is recorded for comparison but cannot change the canonical lane
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:53.352Z'
id: SCEN-NEG-capability-plugin-three-capabilities-v1-SHADOW-OVERRIDE
type: scenario
---
Given an augment classifier that answers predicate and a shadow classifier that answers rule for the same proposition, when classification is composed, then the shadow answer is kept only as a shadow comparison and no canonical decision takes the rule lane.

This is the failure side of shadow mode: a shadow provider must not alter canonical results. documentation/tests/e2e/capability-plugins.e2e.ts asserts "shadow comparison is recorded" and "shadow cannot change the canonical lane".
