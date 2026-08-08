---
id: SCEN-cursor-agent-plugin-v1
title: "Portable Agent Plugin Artifact Behaviors"
type: scenario
status: active
created_at: 2026-08-07T00:00:00Z
updated_at: 2026-08-07T00:00:00Z
source: documentation/scenarios/SCEN-cursor-agent-plugin-v1.md
tags:
  - scenario
  - kibi
  - cursor
  - agent-plugins
links:
  - type: verified_by
    target: TEST-cursor-agent-plugin-v1
  - type: relates_to
    target: REQ-cursor-agent-plugin-standard-v1
---

## Scenario: Portable artifact conforms to the Agent Plugins standard

**Given** the `kibi-cursor` package includes a committed `agent-plugin/` directory
**When** a client that supports the Agent Plugins open standard (agent-plugins.org) loads the artifact
**Then** the root `plugin.json` conforms to the `plugin.schema.json` 1.0.0 manifest
**And** `mcp.json` conforms to the Agent Plugins MCP schema with a `stdio` server pointing at the project-local `kibi-mcp` binary.

## Scenario: Portable artifact regenerates from canonical skills

**Given** the canonical Kibi Agent Skills in `packages/cli/src/public/skills`
**When** `scripts/build-agent-plugin.ts` runs
**Then** `agent-plugin/skills/` mirrors the canonical skills
**And** the artifact is regenerated atomically so a fresh marketplace clone resolves it without a build step.

## Scenario: Marketplace exposes both plugin formats

**Given** the repo marketplace at `.cursor-plugin/marketplace.json`
**When** a user browses installable Kibi plugins
**Then** both `kibi-cursor` (Cursor Plugin) and `kibi-agent-plugin` (portable Agent Plugin) are listed
**And** the portable build is usable by non-Cursor clients while Cursor-only rules, commands, and hooks remain in the Cursor Plugin.
