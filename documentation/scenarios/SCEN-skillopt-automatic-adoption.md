---
id: SCEN-skillopt-automatic-adoption
title: Codex SkillOpt candidates self-improve after safety validation
type: scenario
status: active
created_at: 2026-07-24T00:00:00Z
updated_at: 2026-07-24T00:00:00Z
source: docs/skillopt.md
priority: must
tags: [skillopt, codex, evaluation, security, self-improvement]
links:
  - type: verified_by
    target: TEST-skillopt-automatic-adoption
---

Given a clean source worktree and a Codex-generated SkillOpt body, when the body passes candidate safety validation and its frontmatter and resources hashes match the canonical surface, then the workflow adopts the body transactionally, synchronizes mirrors, records the automatic safety result, and leaves source commit/push decisions to the operator.
