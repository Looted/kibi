---
origin:
  kind: agent
  recorded_at: '2026-11-22T05:02:28.454Z'
priority: must
status: passing
tags:
  - antigravity
  - plugin
  - hooks
  - mcp
title: Verify Antigravity Kibi plugin contract, MCP launcher, and lifecycle hooks
verification_perspective: consumer
verification_scope: end_to_end
id: TEST-antigravity-plugin
type: test
---
# Verify the Antigravity Kibi plugin contract, MCP workspace discovery, and lifecycle hooks

Run with `bun test ./packages/antigravity/tests`.

- `tests/plugin-contract.test.ts`: root `plugin.json` schema and allowed keys, root `hooks.json` event structure and regex matchers, `mcp_config.json`, `rules/AGENTS.md`, executable `bin/` launchers, and zero-drift skill mirror parity.
- `tests/mcp-launcher.test.ts`: workspace opt-in resolution up to `.git`, silent zero-tool fallback outside Kibi workspaces, missing `kibi-mcp` guidance, stdio proxying when local `kibi-mcp` is available, and global Marketplace install discovery via MCP `roots/list`.
- `tests/hook-runner.test.ts`: protojson hook parsing, `call_mcp_tool` unwrapping and `workspaceRoot` stamping, CLI/MCP usage extraction, session start brief, queued PreInvocation snippets, firm-edit confirmation (`force_ask`), stop reminders, opt-in diagnostic usage telemetry, and non-Kibi `PreToolUse` `"ask"` scoping for mutating tools.
