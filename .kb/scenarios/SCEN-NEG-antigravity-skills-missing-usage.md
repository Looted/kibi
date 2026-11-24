---
title: The plugin bundles six skills without kibi-usage is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:31.203Z'
id: SCEN-NEG-antigravity-skills-missing-usage
type: scenario
---
Given the antigravity skills mirror without kibi-usage, when the plugin contract test checks it against the canonical runtime skills, then the drift is reported; a package missing a canonical skill is rejected. packages/antigravity/tests/plugin-contract.test.ts covers the zero-drift skills mirror.