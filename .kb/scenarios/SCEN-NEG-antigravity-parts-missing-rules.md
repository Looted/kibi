---
title: The package ships without its rules directory is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T07:46:09.579Z'
id: SCEN-NEG-antigravity-parts-missing-rules
type: scenario
---
Given a package.json files list without rules, when the plugin contract test checks it, then the list no longer equals the shipped parts and the test fails; a package missing a required part is rejected. packages/antigravity/tests/plugin-contract.test.ts pins the package.json files list and checks that rules/AGENTS.md exists.