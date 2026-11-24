---
origin:
  kind: agent
  recorded_at: '2026-11-22T05:03:05.677Z'
status: active
tags:
  - scenario
  - antigravity
  - plugin
title: Antigravity plugin ships strict-valid manifest, hooks, MCP config, rules, bin scripts and seven skills
id: SCEN-antigravity-plugin-package
type: scenario
expects: success
---
# Antigravity plugin package layout and bundled skills

- **Given** the `packages/antigravity` plugin directory
- **When** `agy plugin validate --strict` and the plugin contract test suite inspect the package
- **Then** root `plugin.json` contains only allowed top-level fields and matches `package.json` version
- **And** root `hooks.json`, `mcp_config.json`, `rules/AGENTS.md`, `assets/logo.svg`, and self-contained `bin/` scripts exist
- **And** `skills/` mirrors the seven canonical Kibi skills with zero drift
