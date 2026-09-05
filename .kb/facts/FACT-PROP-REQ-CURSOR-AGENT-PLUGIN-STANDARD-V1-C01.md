---
title: The `kibi-cursor` package ships a portable Agent Plugin artifact alongside the C
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_cursor_agent_plugin_standard_v1
property_key: clause_01_the_kibi_cursor_package_ships_a_portable_agent_p
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_cursor_agent_plugin_standard_v1.clause_01_the_kibi_cursor_package_ships_a_portable_agent_p.eq.true
claim_key: CLAIM-0EA604F8BA5012AB
claim_text: 'The `kibi-cursor` package ships a portable Agent Plugin artifact alongside the Cursor Plugin, so any client that supports the open Agent Plugins standard (agent-plugins.org) can load Kibi''s Agent Skills and MCP server without client-specific adaptation.\n\nThe portable artifact should:\n\nConform to the Agent Plugins 1.0.0 manifest schema (`plugin.schema.json`) with a root `plugin.json`.\nPackage the canonical Kibi Agent Skills under `skills/`.\nInclude an `mcp.json` that conforms to the Agent Plugins MCP schema (`mcp.schema.json`) and points at the project-local `kibi-mcp` binary via `npx --no-install`.\nStay committed and regenerable so a fresh marketplace clone resolves it without a build step, with Cursor-only components (rules, commands, hooks) remaining in the `.cursor-plugin` Cursor Plugin build.\nBe listed in the repo marketplace alongside the Cursor Plugin (`plugins/kibi-agent-plugin`).\nEmit `plugin.json` and `mcp.json` in the repository''s canonical (biome-clean) JSON formatting so the regenerated committed artifact passes `bun run check`.\nThe portable MCP launcher must prefer the running build when the project-local resolution matches its version: a same-version copy must not be re-entered, so local dogfooding and unreleased fixes are honored instead of a stale store copy.\nWhen launched from a workspace without its own `package.json`, the portable MCP launcher must not resolve an unrelated ambient cached `kibi-mcp` package; the explicitly launched server remains authoritative.\n\nThis requirement is scoped to portable plugin packaging and cross-client distribution'
id: FACT-PROP-REQ-CURSOR-AGENT-PLUGIN-STANDARD-V1-C01
type: fact
---
