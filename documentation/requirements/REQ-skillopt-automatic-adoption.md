---
id: REQ-skillopt-automatic-adoption
title: Passing SkillOpt candidates must self-improve the canonical skill
status: open
created_at: 2026-07-24T00:00:00Z
updated_at: 2026-07-24T00:00:00Z
source: docs/skillopt.md
priority: must
tags: [skillopt, codex, evaluation, security, self-improvement]
links:
  - type: specified_by
    target: SCEN-skillopt-automatic-adoption
  - type: verified_by
    target: TEST-skillopt-automatic-adoption
  - type: supersedes
    target: REQ-skillopt-codex-optimization
---

After Codex-only preflight and smoke checks pass, a generated SkillOpt candidate must pass automatic safety and immutable-surface validation before it is adopted into the canonical skill and synchronized mirrors. Automatic adoption must use the transactional rollback path, must never claim a behavioral evaluation pass when none was run, and must not commit or push source changes.

The explicit report, proposal, and reviewer approval workflow remains available for higher-assurance behavioral evaluation and offline artifacts.
