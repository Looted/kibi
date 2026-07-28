---
id: TEST-skillopt-automatic-adoption
title: SkillOpt preserves evaluated candidates without adoption
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

The real workflow integration suite verifies that training receives only public descriptors, evaluates a frozen candidate on a fresh development cell and a blinded 36-cell held-out matrix, then preserves the canonical skill and mirrors unchanged. It also verifies that the review receipt exposes only aggregate held-out eligibility and never adopts a candidate during training or evaluation.
