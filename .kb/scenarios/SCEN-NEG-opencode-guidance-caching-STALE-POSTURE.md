---
title: Cached guidance is not reused after the workspace posture changes
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:00.130Z'
id: SCEN-NEG-opencode-guidance-caching-STALE-POSTURE
type: scenario
---
Given guidance recorded as satisfied for a root_active context, when the posture is invalidated, then the cache refuses to report the old satisfaction: the same context key reads as unsatisfied until guidance is recorded again.

This is the failure side of guidance caching: a decision cached under one posture must not silence guidance after the posture changed. documentation/tests/e2e/packed/opencode-enforcement-surface.test.ts "caches guidance per context and invalidates on posture change" exercises it.
