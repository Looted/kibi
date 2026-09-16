---
id: REQ-codex-kibi-plugin-v1
title: 'Codex Kibi Plugin v1: Optional MCP adapter package'
status: open
created_at: 2026-06-02T00:00:00.000Z
updated_at: 2026-06-02T00:00:00.000Z
source: packages/codex/
priority: must
owner: codex-team
tags:
  - kibi
  - codex
  - plugin
  - mcp
links:
  - type: specified_by
    target: SCEN-codex-kibi-plugin-v1
  - type: verified_by
    target: TEST-codex-kibi-plugin-v1
semantic_text: The `kibi-codex` package is an optional Codex adapter for teams who want Kibi in Codex workflows without changing core Kibi runtime components.\n\nWhen installed and enabled, it should:\n\nKeep `kibi-core`, `kibi-cli`, and `kibi-mcp` as the required foundation for project-local Kibi operations.\nBundle and expose a Codex plugin manifest, skills, hooks, and MCP server config that points to the local project `kibi-mcp` binary.\nRun hook-driven reminders and warnings only, so it does not replace MCP tooling behavior or write directly to `.kb`.\nRemain clearly documented as optional, with a supported manual MCP configuration path when teams do not use the plugin installer path.\n\nThis requirement is now scoped to plugin documentation and operational guidance.
logic_claims:
  - CLAIM-BE5BFCB5AECD235B
semantic_clauses:
  - The `kibi-codex` package is an optional Codex adapter for teams who want Kibi in Codex workflows without changing core Kibi runtime components.\n\nWhen installed and enabled, it should:\n\nKeep `kibi-core`, `kibi-cli`, and `kibi-mcp` as the required foundation for project-local Kibi operations.\nBundle and expose a Codex plugin manifest, skills, hooks, and MCP server config that points to the local project `kibi-mcp` binary.\nRun hook-driven reminders and warnings only, so it does not replace MCP tooling behavior or write directly to `.kb`.\nRemain clearly documented as optional, with a supported manual MCP configuration path when teams do not use the plugin installer path.\n\nThis requirement is now scoped to plugin documentation and operational guidance
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 682349dea922586acf095befd60c166f2ecfc06f6f95687001d90979507ecc8a
semantic_inventory:
  - claim_key: CLAIM-BE5BFCB5AECD235B
    claim_text: The `kibi-codex` package is an optional Codex adapter for teams who want Kibi in Codex workflows without changing core Kibi runtime components.\n\nWhen installed and enabled, it should:\n\nKeep `kibi-core`, `kibi-cli`, and `kibi-mcp` as the required foundation for project-local Kibi operations.\nBundle and expose a Codex plugin manifest, skills, hooks, and MCP server config that points to the local project `kibi-mcp` binary.\nRun hook-driven reminders and warnings only, so it does not replace MCP tooling behavior or write directly to `.kb`.\nRemain clearly documented as optional, with a supported manual MCP configuration path when teams do not use the plugin installer path.\n\nThis requirement is now scoped to plugin documentation and operational guidance
    role: normative
    status: modeled
    span:
      start: 0
      end: 765
type: req
---

The `kibi-codex` package is an optional Codex adapter for teams who want Kibi in Codex workflows without changing core Kibi runtime components.

When installed and enabled, it should:

1. Keep `kibi-core`, `kibi-cli`, and `kibi-mcp` as the required foundation for project-local Kibi operations.
2. Bundle and expose a Codex plugin manifest, skills, hooks, and MCP server config that points to the local project `kibi-mcp` binary.
3. Run hook-driven reminders and warnings only, so it does not replace MCP tooling behavior or write directly to `.kb`.
4. Remain clearly documented as optional, with a supported manual MCP configuration path when teams do not use the plugin installer path.

This requirement is now scoped to plugin documentation and operational guidance.
