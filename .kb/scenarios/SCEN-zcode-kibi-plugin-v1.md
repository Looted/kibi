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
**And** nothing is initialized, launched, or written unless the user explicitly asks for it.

## Scenario: Mutation tracking with canonical paths

**Given** a session that only reads files (`Read`, search tools, or path-bearing read-only calls)
**When** the session stops
**Then** no impact or freshness reminder fires, because read-only path arguments are not evidence of change.

**Given** edits to files named with absolute paths, `./`-prefixed paths, Windows separators, or a subdirectory working directory
**When** impact checks name the same files in the repo-relative `kb_check` contract
**Then** the hook state compares canonical workspace-relative identities
**And** a reminder names the workspace-relative path, while paths outside the workspace are never reinterpreted as internal files.

## Scenario: Impact checks invalidated by later edits

**Given** an edit to a source path that a covering impact-enabled `kb_check` acknowledged
**When** that exact path is edited again
**Then** the check is invalidated for that path only
**And** a still-current check for a different file is preserved, and checking one file never acknowledges unchecked edits to another.

## Scenario: Session isolation within one workspace

**Given** two ZCode sessions sharing one opted-in workspace and plugin-data root
**When** session A edits files and session B stops
**Then** session B receives no reminders and consumes nothing
**And** session A still receives its own reminders at its own stop, with events lacking a session id isolated in a separate bucket.

## Scenario: Local-built marketplace installation

**Given** a checkout of this repository with `bun run build:zcode` executed
**When** a user adds the repository directory (the one containing `.claude-plugin/marketplace.json`) as a local marketplace and installs `kibi-zcode`
**Then** the installed copy contains the built hook runner, launcher, hooks, skills, and command, and they run under Node from the installed layout
**And** GitHub-source installs are documented as unsupported because the generated `dist/hook-runner.js` is not committed.

## Scenario: Manual fallback path without plugin

**Given** a workspace that only has local `kibi` packages installed
**When** a user chooses not to install `kibi-zcode`
**Then** ZCode still works by manual MCP configuration
**And** users can still connect to `kibi-mcp` directly using the local command and args documented in `docs/install.md`.
