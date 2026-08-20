---
id: SCEN-reusable-skill-subsystem
title: CLI loads and validates bundled reusable skills
type: scenario
status: active
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
source: packages/cli/tests/skills.test.ts
tags: [cli, skills]
links:
  - type: verified_by
    target: TEST-skill-cli-load-validate
---

The skills subsystem lists bundled skills, loads skill metadata/body content, validates resource paths, and rejects invalid or oversized bundles.
