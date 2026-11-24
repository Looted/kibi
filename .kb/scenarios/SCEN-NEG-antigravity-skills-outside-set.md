---
title: The plugin bundles a skill outside the seven Kibi skills is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:34.253Z'
id: SCEN-NEG-antigravity-skills-outside-set
type: scenario
---
Given an extra skill directory such as kibi-extra in packages/antigravity/skills, when the plugin contract test checks the mirror, then the extra skill is reported as drift; a skill outside the canonical seven is rejected. packages/antigravity/tests/plugin-contract.test.ts covers the zero-drift skills mirror.