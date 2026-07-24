---
id: TEST-skillopt-automatic-adoption
title: SkillOpt automatically adopts safety-passing candidates
type: test
status: passing
created_at: 2026-07-24T00:00:00Z
updated_at: 2026-07-24T00:00:00Z
source: scripts/skillopt-eval/tests/real-workflow.test.ts
priority: must
tags: [skillopt, codex, evaluation, integration, security, self-improvement]
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: SCEN-skillopt-automatic-adoption
---

The real workflow integration suite verifies that a generated candidate is automatically adopted into the canonical skill and mirrors after the safety and immutable-surface gates pass, while a run with no generated optimizer step remains blocked.
