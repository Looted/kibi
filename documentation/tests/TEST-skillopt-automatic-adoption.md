---
id: TEST-skillopt-automatic-adoption
title: SkillOpt adopts eligible predicate candidates exactly once
type: test
status: passing
created_at: 2026-07-24T00:00:00Z
updated_at: 2026-07-29T00:00:00Z
source: scripts/skillopt-eval/tests/adoption.test.ts
priority: must
tags: [skillopt, codex, evaluation, integration, security, self-improvement]
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: SCEN-skillopt-automatic-adoption
---

The adoption suite verifies that eligible predicate candidates are adopted exactly once: the canonical skill and mirrors install in one transaction, retries return the existing receipt, ineligible candidates remain unchanged, and rollback or recovery prevents partial state. See scripts/skillopt-eval/tests/adoption.test.ts, adoption-exactly-once.test.ts, and real-workflow.test.ts.
