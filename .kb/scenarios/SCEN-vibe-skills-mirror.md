---
title: Scenario for REQ-vibe-skills-mirror
status: active
tags:
  - vibe
origin:
  kind: agent
  recorded_at: '2026-11-19T20:15:56.962Z'
id: SCEN-vibe-skills-mirror
type: scenario
---
Given the canonical skill kibi-usage with name Kibi Usage, when sync-agent-skills runs with --target vibe, then packages/vibe/skills/kibi-usage/SKILL.md has name: kibi-usage and byte-identical resources. Given a drifted mirror, when CI runs bun run --filter kibi-vibe check:skills, then the check exits non-zero.