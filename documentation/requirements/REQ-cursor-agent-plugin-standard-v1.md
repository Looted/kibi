---
id: REQ-cursor-agent-plugin-standard-v1
title: "Cursor Plugin Ships a Portable Agent Plugin Artifact"
status: open
created_at: 2026-08-07T00:00:00Z
updated_at: 2026-08-07T15:00:00Z
source: packages/cursor/agent-plugin/
priority: must
owner: cursor-team
tags:
  - kibi
  - cursor
  - plugin
  - agent-plugins
  - portable
links:
  - type: specified_by
    target: SCEN-cursor-agent-plugin-v1
  - type: verified_by
    target: TEST-cursor-agent-plugin-v1
---

The `kibi-cursor` package ships a portable Agent Plugin artifact alongside the Cursor Plugin, so any client that supports the open Agent Plugins standard (agent-plugins.org) can load Kibi's Agent Skills and MCP server without client-specific adaptation.

The portable artifact should:

1. Conform to the Agent Plugins 1.0.0 manifest schema (`plugin.schema.json`) with a root `plugin.json`.
2. Package the canonical Kibi Agent Skills under `skills/`.
3. Include an `mcp.json` that conforms to the Agent Plugins MCP schema (`mcp.schema.json`) and points at the project-local `kibi-mcp` binary via `npx --no-install`.
4. Stay committed and regenerable so a fresh marketplace clone resolves it without a build step, with Cursor-only components (rules, commands, hooks) remaining in the `.cursor-plugin` Cursor Plugin build.
5. Be listed in the repo marketplace alongside the Cursor Plugin (`plugins/kibi-agent-plugin`).
6. Emit `plugin.json` and `mcp.json` in the repository's canonical (biome-clean) JSON formatting so the regenerated committed artifact passes `bun run check`.

This requirement is scoped to portable plugin packaging and cross-client distribution.
