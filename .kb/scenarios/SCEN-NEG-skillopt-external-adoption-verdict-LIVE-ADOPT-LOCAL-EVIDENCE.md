---
title: Adopting from local SkillOpt evidence without the offline review lane is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:03:53.935Z'
id: SCEN-NEG-skillopt-external-adoption-verdict-LIVE-ADOPT-LOCAL-EVIDENCE
type: scenario
---
Given a local SkillOpt run, when the operator runs adopt without --fake, then the command exits 2 naming the offline review lane, and the canonical skill directory is left unchanged.

This is the failure side of the adoption verdict: local or fake evidence stays review-only and never mutates the canonical skill surface. documentation/tests/e2e/skillopt-trust-boundaries.e2e.ts, in its third part where local evidence stays review-only, exercises it.
