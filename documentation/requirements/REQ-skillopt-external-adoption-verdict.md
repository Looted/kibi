---
id: REQ-skillopt-external-adoption-verdict
title: SkillOpt production adoption requires an independently verified external verdict
status: open
created_at: 2026-07-30T00:00:00Z
updated_at: 2026-07-30T00:00:00Z
source: docs/skillopt.md
priority: must
tags: [skillopt, codex, evaluation, security, self-improvement]
links:
  - type: specified_by
    target: SCEN-skillopt-external-adoption-verdict
  - type: verified_by
    target: TEST-skillopt-external-adoption-verdict
  - type: supersedes
    target: REQ-skillopt-automatic-adoption
---

Local or fake SkillOpt evidence stays review-only. Production mutation of the canonical skill and mirrors is allowed only after an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence. This requirement does not assume any repository-hosted signer or authority service.
