---
id: REQ-skillopt-codex-optimization
title: SkillOpt optimization must use Codex-only behavioral evidence
status: open
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: documentation/facts/FACT-skillopt-methodology.md
priority: must
tags: [skillopt, codex, evaluation, security]
links:
  - type: specified_by
    target: SCEN-skillopt-codex-optimization
  - type: verified_by
    target: TEST-skillopt-codex-optimization
  - type: supersedes
    target: REQ-skill-behavioral-efficacy
---

SkillOpt behavioral evaluation must use Codex as its sole host. Candidate adoption remains forbidden until every individual and bundle gate passes and a reviewer explicitly approves the exact candidate hashes. Optimization may change skill bodies only; skill frontmatter and declared resources remain immutable.
