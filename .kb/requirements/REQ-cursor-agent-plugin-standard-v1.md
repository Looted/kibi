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
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-cursor-agent-plugin-v1
  - type: verified_by
    target: TEST-cursor-agent-plugin-v1
semantic_text: Any client that supports the open Agent Plugins standard must be able to load Kibi Agent Skills and the MCP server from the kibi-cursor portable Agent Plugin artifact.
logic_claims:
  - CLAIM-3CB809860540987C
semantic_clauses:
  - Any client that supports the open Agent Plugins standard must be able to load Kibi Agent Skills and the MCP server from the kibi-cursor portable Agent Plugin artifact.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2de66b6fe287a8edb302d4f82e28830b5ecaff8cb0d94d10c6c20d60e39e70f3
semantic_inventory:
  - claim_key: CLAIM-3CB809860540987C
    claim_text: Any client that supports the open Agent Plugins standard must be able to load Kibi Agent Skills and the MCP server from the kibi-cursor portable Agent Plugin artifact
    role: normative
    status: modeled
    span:
      start: 0
      end: 166
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-27T08:36:26.457Z'
firmness: firm
---
Any client that supports the open Agent Plugins standard must be able to load Kibi Agent Skills and the MCP server from the kibi-cursor portable Agent Plugin artifact.

## Context

kibi-cursor ships a portable Agent Plugin artifact next to its Cursor Plugin, so clients other than Cursor can use Kibi. What the artifact contains and which schema fields it uses is stated in REQ-cursor-agent-plugin-package, where each claim is proved from the artifact files. This requirement keeps the portability outcome, which the end-to-end test checks.

Packaging details the end-to-end and package tests check: the artifact's mcp.json starts the project-local kibi-mcp through npx --no-install. The artifact stays committed and regenerable, so a fresh marketplace clone resolves it without a build step, while the Cursor-only parts (rules, commands, hooks) stay in the .cursor-plugin build. It is listed in the repository marketplace next to the Cursor Plugin as plugins/kibi-agent-plugin, and its plugin.json and mcp.json are written in the repository's canonical JSON formatting so the regenerated artifact passes bun run check. The portable MCP launcher prefers the running build when the project-local resolution has the same version, so a same-version copy is not re-entered and local fixes are honoured instead of a stale store copy. Launched from a workspace without its own package.json, it does not resolve an unrelated cached kibi-mcp package; the explicitly launched server stays authoritative.

## Why this changed

On 2026-10-27 the artifact layout claims moved to REQ-cursor-agent-plugin-package so that they can be proved from the files. The two conformance claims became four checkable ones: each manifest declares its Agent Plugins 1.0.0 schema and uses only that schema's fields.
