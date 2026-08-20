---
id: REQ-reusable-skill-subsystem
title: Reusable Markdown Skill Subsystem for Agent Guidance
status: open
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
source: packages/cli/src/public/skills.ts
priority: must
tags: [cli, skills]
links:
  - type: specified_by
    target: SCEN-reusable-skill-subsystem
  - type: verified_by
    target: TEST-skill-cli-load-validate
---

The CLI exposes reusable bundled Markdown skills and validates their manifests/resources before surfacing them to agents.
