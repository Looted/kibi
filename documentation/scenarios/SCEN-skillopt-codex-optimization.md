---
id: SCEN-skillopt-codex-optimization
title: Codex-only SkillOpt candidates are gated before adoption
type: scenario
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-22T00:00:00Z
source: documentation/facts/FACT-skillopt-methodology.md
priority: must
tags: [skillopt, codex, evaluation, security]
links:
  - type: verified_by
    target: TEST-skillopt-codex-optimization
---

Given frozen baseline, one-shot, and SkillOpt skill-body variants with unchanged frontmatter and resources, when the evaluator scores 16 held-out tasks per variant and eight bundle tasks on Codex, then it applies the preregistered aggregate, family, bootstrap, security, and explicit-approval gates without treating OpenCode or Cursor as evaluated hosts.
