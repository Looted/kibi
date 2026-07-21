---
id: TEST-skillopt-codex-optimization
title: Codex SkillOpt contract rejects stale hosts and gates
type: test
status: passing
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: scripts/skillopt-eval/tests/methodology-contract.test.ts
priority: must
tags: [skillopt, codex, evaluation, integration, security]
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: SCEN-skillopt-codex-optimization
---

The parsed methodology and run-lock contracts require the same Codex-only host, held-out, family, bootstrap, and bundle gate values. The run-lock schema rejects stale evaluation-host arrays before a run can start.
