---
id: SCEN-cursor-kibi-plugin-v1
title: "Cursor Kibi Plugin v1: Optional Adapter Behaviors"
type: scenario
status: active
created_at: 2026-06-09T00:00:00Z
updated_at: 2026-06-09T00:00:00Z
source: documentation/scenarios/SCEN-cursor-kibi-plugin-v1.md
tags:
  - scenario
  - cursor
  - plugin
links:
  - type: verified_by
    target: TEST-cursor-kibi-plugin-v1
  - type: relates_to
    target: REQ-cursor-kibi-plugin-v1
---

## Scenario: Optional plugin installation and use in Cursor

**Given** a workspace has `kibi-cli`, `kibi-mcp`, `kibi-core`, and SWI-Prolog installed locally
**When** a user installs `kibi-cursor` from the marketplace or local plugin directory
**Then** plugin rules, skills, commands, and MCP config appear as an optional capability that delegates MCP transport and checks to the existing `kibi-mcp` server.

## Scenario: Reminder and trust behavior

**Given** a Cursor session with modified source paths and a missing Kibi bootstrap state
**When** `kibi-cursor` hooks execute during session start, tool calls, or stop
**Then** the plugin may emit at most advisory reminders about setup and freshness
**And** it must not take blocking action or replace core MCP behavior.

## Scenario: Manual fallback path without plugin

**Given** a workspace that only has local `kibi` packages installed
**When** a user chooses not to install `kibi-cursor`
**Then** Cursor still works by manual MCP configuration
**And** users can still connect to `kibi-mcp` directly using the local command and args documented in `docs/install.md`.
