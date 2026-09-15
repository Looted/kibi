---
id: SCEN-zcode-kibi-plugin-v1
title: "ZCode Kibi Plugin v1: Optional Adapter Behaviors"
type: scenario
status: active
created_at: 2026-09-15T00:00:00Z
updated_at: 2026-09-15T00:00:00Z
source: .kb/scenarios/SCEN-zcode-kibi-plugin-v1.md
tags:
  - scenario
  - zcode
  - plugin
links:
  - type: verified_by
    target: TEST-zcode-kibi-plugin-v1
  - type: relates_to
    target: REQ-zcode-kibi-plugin-v1
---

## Scenario: Optional plugin installation and use in ZCode

**Given** a workspace has `kibi-cli`, `kibi-mcp`, and `kibi-core` installed locally
**When** a user adds the Kibi marketplace in ZCode, installs `kibi-zcode`, and starts a session in an opted-in workspace
**Then** the bundled Kibi skills, the `/kibi-bootstrap` command, and the `kibi` MCP server appear as a separate optional capability that delegates MCP transport and checks to the existing MCP config.

## Scenario: Advisory hooks and workspace opt-in

**Given** a ZCode session in a workspace whose Kibi project root owns `.kb/manifest.json`
**When** the plugin hooks execute on session start, edit-like tool calls, or stop
**Then** the plugin may emit at most advisory context about direct `.kb` edits, freshness, and impact checks
**And** it must not take blocking action or replace core MCP behavior.

**Given** a workspace whose Kibi project root does not own `.kb/manifest.json`
**When** the plugin hooks execute or the MCP launcher starts
**Then** the plugin stays silent and the MCP server exposes an empty tool catalog
**And** nothing is initialized or written unless the user explicitly asks for it.

## Scenario: Manual fallback path without plugin

**Given** a workspace that only has local `kibi` packages installed
**When** a user chooses not to install `kibi-zcode`
**Then** ZCode still works by manual MCP configuration
**And** users can still connect to `kibi-mcp` directly using the local command and args documented in `docs/install.md`.
