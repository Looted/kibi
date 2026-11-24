---
title: The package ships without rules/AGENTS.md is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:37.371Z'
id: SCEN-NEG-antigravity-parts-missing-rules
type: scenario
---
Given a package without rules/AGENTS.md, when the plugin contract test checks the shipped parts, then the missing rules file fails it; a package missing a required part is rejected. packages/antigravity/tests/plugin-contract.test.ts covers the manifest, hooks, MCP config, rules and bin scripts.