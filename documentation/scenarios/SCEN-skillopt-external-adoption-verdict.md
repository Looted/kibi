---
id: SCEN-skillopt-external-adoption-verdict
title: SkillOpt production adoption waits for an external verdict
type: scenario
status: active
created_at: 2026-07-30T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
source: docs/skillopt.md
priority: must
tags: [skillopt, codex, evaluation, security, self-improvement]
links:
  - type: verified_by
    target: TEST-skillopt-external-adoption-verdict
---

Given local or fake SkillOpt evidence from a clean source root, when the evaluator has review artifacts but no independently verified external verdict, then the result remains review-only and cannot mutate the canonical skill or mirrors.

Given an independently verified external verdict bound to the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence, when production adoption runs, then it may mutate canonical and mirror surfaces exactly once.

Given a real optimization invocation with a missing executable, interrupted cell, exhausted budget, or conflicting evidence, when the workflow reports the result, then it stops launching later cells and returns a structured infrastructure no-go containing the failed stage, task, variant, critical failures, and receipt path instead of labeling the incomplete matrix ineligible.
