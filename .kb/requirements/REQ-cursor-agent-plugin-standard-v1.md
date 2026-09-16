---
id: REQ-cursor-agent-plugin-standard-v1
title: Cursor Plugin Ships a Portable Agent Plugin Artifact
status: open
created_at: 2026-08-07T00:00:00.000Z
updated_at: 2026-08-07T15:00:00.000Z
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
semantic_text: The kibi-cursor package must ship a portable Agent Plugin artifact alongside the Cursor Plugin. The portable artifact must conform to the Agent Plugins 1.0.0 manifest schema with a root plugin.json. The portable artifact must package the canonical Kibi Agent Skills under the skills directory. The portable artifact must include an mcp.json that conforms to the Agent Plugins MCP schema. Any client that supports the open Agent Plugins standard must be able to load Kibi Agent Skills and the MCP server from that artifact.
logic_claims:
  - CLAIM-B5A638FEE8D1C66C
  - CLAIM-961BE04CC123F56E
  - CLAIM-B9E994AA90FE0B42
  - CLAIM-B80FC679503D75EB
  - CLAIM-4034D7E0BF135200
semantic_clauses:
  - The kibi-cursor package must ship a portable Agent Plugin artifact alongside the Cursor Plugin
  - The portable artifact must conform to the Agent Plugins 1.0.0 manifest schema with a root plugin.json
  - The portable artifact must package the canonical Kibi Agent Skills under the skills directory
  - The portable artifact must include an mcp.json that conforms to the Agent Plugins MCP schema
  - Any client that supports the open Agent Plugins standard must be able to load Kibi Agent Skills and the MCP server from that artifact
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 64ecfecc570659e9bc14526389eacf7dd712ff312cfb821c4481029e4d5dace0
semantic_inventory:
  - claim_key: CLAIM-B5A638FEE8D1C66C
    claim_text: The kibi-cursor package must ship a portable Agent Plugin artifact alongside the Cursor Plugin
    role: normative
    status: modeled
    span:
      start: 0
      end: 94
  - claim_key: CLAIM-961BE04CC123F56E
    claim_text: The portable artifact must conform to the Agent Plugins 1.0.0 manifest schema with a root plugin.json
    role: normative
    status: modeled
    span:
      start: 96
      end: 197
  - claim_key: CLAIM-B9E994AA90FE0B42
    claim_text: The portable artifact must package the canonical Kibi Agent Skills under the skills directory
    role: normative
    status: modeled
    span:
      start: 199
      end: 292
  - claim_key: CLAIM-B80FC679503D75EB
    claim_text: The portable artifact must include an mcp.json that conforms to the Agent Plugins MCP schema
    role: normative
    status: modeled
    span:
      start: 294
      end: 386
  - claim_key: CLAIM-4034D7E0BF135200
    claim_text: Any client that supports the open Agent Plugins standard must be able to load Kibi Agent Skills and the MCP server from that artifact
    role: normative
    status: modeled
    span:
      start: 388
      end: 521
type: req
---

The `kibi-cursor` package ships a portable Agent Plugin artifact alongside the Cursor Plugin, so any client that supports the open Agent Plugins standard (agent-plugins.org) can load Kibi's Agent Skills and MCP server without client-specific adaptation.

The portable artifact should:

1. Conform to the Agent Plugins 1.0.0 manifest schema (`plugin.schema.json`) with a root `plugin.json`.
2. Package the canonical Kibi Agent Skills under `skills/`.
3. Include an `mcp.json` that conforms to the Agent Plugins MCP schema (`mcp.schema.json`) and points at the project-local `kibi-mcp` binary via `npx --no-install`.
4. Stay committed and regenerable so a fresh marketplace clone resolves it without a build step, with Cursor-only components (rules, commands, hooks) remaining in the `.cursor-plugin` Cursor Plugin build.
5. Be listed in the repo marketplace alongside the Cursor Plugin (`plugins/kibi-agent-plugin`).
6. Emit `plugin.json` and `mcp.json` in the repository's canonical (biome-clean) JSON formatting so the regenerated committed artifact passes `bun run check`.
7. The portable MCP launcher must prefer the running build when the project-local resolution matches its version: a same-version copy must not be re-entered, so local dogfooding and unreleased fixes are honored instead of a stale store copy.
8. When launched from a workspace without its own `package.json`, the portable MCP launcher must not resolve an unrelated ambient cached `kibi-mcp` package; the explicitly launched server remains authoritative.

This requirement is scoped to portable plugin packaging and cross-client distribution.
