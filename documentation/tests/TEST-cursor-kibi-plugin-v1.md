---
id: TEST-cursor-kibi-plugin-v1
title: Cursor Kibi Plugin v1 Verification
status: active
created_at: 2026-06-09T00:00:00Z
updated_at: 2026-06-09T00:00:00Z
priority: must
tags:
  - test
  - kibi
  - cursor
  - plugin
  - verification
links:
  - type: validates
    target: SCEN-cursor-kibi-plugin-v1
  - type: relates_to
    target: REQ-cursor-kibi-plugin-v1
---

Verification for `kibi-cursor` documentation and plugin onboarding guidance includes:

- Ensure `packages/cursor/.cursor-plugin/plugin.json` exports plugin manifest paths and MCP config for the project-local `kibi-mcp` server.
- Ensure `.cursor-plugin/marketplace.json` exposes `kibi-cursor` from `plugins/kibi-cursor` for repo-scoped Cursor marketplace installs.
- Ensure installation guidance in `README.md`, `packages/cursor/README.md`, and `docs/install.md` states `kibi-cursor` is optional and keeps `kibi-core`, `kibi-cli`, `kibi-mcp`, and SWI-Prolog as foundational dependencies.
- Ensure marketplace and plugin descriptions document prerequisites before enabling the bundled MCP server.
- Ensure the optional Cursor plugin section documents hook bundle behavior and fallback/manual MCP configuration.
- Ensure `docs/architecture.md` models the Cursor plugin as an adapter layer that connects to MCP/Kibi rather than replacing storage or core CLI behavior.
- Ensure repo dogfood wiring documents `.cursor/mcp.json`, `.cursor/hooks.json`, and `scripts/sync-cursor-dogfood.sh` for local artifact testing.
