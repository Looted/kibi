---
id: SCEN-skillopt-codex-optimization
title: Codex-only SkillOpt candidates are gated before adoption
type: scenario
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
source: documentation/facts/FACT-skillopt-methodology.md
priority: must
tags: [skillopt, codex, evaluation, security]
links:
  - type: verified_by
    target: TEST-skillopt-codex-optimization
---

Given frozen baseline, one-shot, and SkillOpt skill-body variants with unchanged frontmatter and resources, when the evaluator scores 16 held-out tasks per variant and eight bundle tasks on Codex, then it applies the preregistered aggregate, family, bootstrap, security, and explicit-approval gates without treating OpenCode or Cursor as evaluated hosts.

Given a non-fake bridge request with the source worktree, fixture, evaluator manifest, and artifact root, when the bridge evaluates a candidate, then it delegates the episode to the isolated Codex cell runner with the real login and MCP dependencies.

Given a paid optimization run with development, trainer-bridge, and held-out cells, when runtime staging completes, then every cell receives the same absolute staged Codex and bwrap paths and the private lease is removed after the run. If any infrastructure, interruption, budget, or evidence-conflict failure occurs, later cells are not launched and the run returns a structured no-go without a terminal eligibility review; ordinary behavioral failures continue through the gates.
