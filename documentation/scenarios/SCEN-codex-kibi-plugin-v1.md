---
id: SCEN-codex-kibi-plugin-v1
title: "Codex Kibi Plugin v1: Optional Adapter Behaviors"
type: scenario
status: active
created_at: 2026-06-02T00:00:00Z
updated_at: 2026-06-02T00:00:00Z
source: documentation/scenarios/SCEN-codex-kibi-plugin-v1.md
tags:
  - scenario
  - codex
  - plugin
links:
  - type: verified_by
    target: TEST-codex-kibi-plugin-v1
  - type: relates_to
    target: REQ-codex-kibi-plugin-v1
---

## Scenario: Optional plugin installation and use in Codex

**Given** a workspace has `kibi-cli`, `kibi-mcp`, and `kibi-core` installed locally
**When** a user installs `kibi-codex` and configures Codex to load the plugin
**Then** plugin help for Kibi appears as a separate optional capability that delegates MCP transport and checks to the existing MCP config.

## Scenario: Reminder and trust behavior

**Given** a Codex session with modified source paths and a missing Kibi bootstrap state
**When** `kibi-codex` hooks execute during session start, tool calls, or stop
**Then** the plugin may emit at most advisory reminders about setup and freshness
**And** it must not take blocking action or replace core MCP behavior.

## Scenario: Manual fallback path without plugin

**Given** a workspace that only has local `kibi` packages installed
**When** a user chooses not to install `kibi-codex`
**Then** Codex still works by manual MCP configuration
**And** users can still connect to `kibi-mcp` directly using the local command and args documented in `docs/install.md`.
