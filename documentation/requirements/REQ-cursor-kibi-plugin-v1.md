---
id: REQ-cursor-kibi-plugin-v1
title: "Cursor Kibi Plugin v1: Optional MCP adapter package"
status: open
created_at: 2026-06-09T00:00:00Z
updated_at: 2026-06-09T00:00:00Z
source: packages/cursor/
priority: must
owner: cursor-team
tags:
  - kibi
  - cursor
  - plugin
  - mcp
links:
  - type: specified_by
    target: SCEN-cursor-kibi-plugin-v1
  - type: verified_by
    target: TEST-cursor-kibi-plugin-v1
---

The `kibi-cursor` package is an optional Cursor adapter for teams who want Kibi in Cursor workflows without changing core Kibi runtime components.

When installed and enabled, it should:

1. Keep `kibi-core`, `kibi-cli`, `kibi-mcp`, and SWI-Prolog as the required foundation for project-local Kibi operations.
2. Bundle and expose a Cursor plugin manifest, rules, skills, commands, hooks, and MCP server config that points to the local project `kibi-mcp` binary.
3. Run hook-driven reminders and warnings only, so it does not replace MCP tooling behavior or write directly to `.kb`.
4. Remain clearly documented as optional, with a supported manual MCP configuration path when teams do not use the plugin installer path.

This requirement is scoped to plugin documentation and operational guidance.
