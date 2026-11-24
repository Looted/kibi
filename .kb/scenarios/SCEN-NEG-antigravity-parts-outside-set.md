---
title: The package ships a file outside its plugin parts is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T07:46:12.502Z'
id: SCEN-NEG-antigravity-parts-outside-set
type: scenario
---
Given a package.json files list that adds src, tests or tsconfig.json, when the plugin contract test checks it, then the list no longer equals the shipped parts and the test fails; a packaged file outside the set is rejected. packages/antigravity/tests/plugin-contract.test.ts pins the package.json files list exactly.