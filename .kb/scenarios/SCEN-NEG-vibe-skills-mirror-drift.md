---
title: A drifted Vibe skill mirror fails the drift check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-19T22:37:25.732Z'
id: SCEN-NEG-vibe-skills-mirror-drift
type: scenario
---
Given packages/vibe/skills differs from the canonical skills or has frontmatter name not equal to the skill id, when CI runs the mirror drift check, then the drift is rejected with a non-zero exit: bun run --filter kibi-vibe check:skills must fail. The CI 'Check Vibe skill mirror drift' step and scripts/tests/sync-agent-skills.test.ts cover the --target vibe case.