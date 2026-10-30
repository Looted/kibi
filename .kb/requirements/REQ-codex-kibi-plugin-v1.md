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
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-codex-kibi-plugin-v1
  - type: verified_by
    target: TEST-codex-kibi-plugin-v1
semantic_text: 'The kibi-codex package must remain optional. When kibi-codex is installed or enabled, it must not modify core Kibi runtime components. The kibi-codex MCP launcher must start the project-local kibi-mcp binary. kibi-codex hooks must never deny a tool call: they add reminders and warnings, and at Stop they ask the agent to continue. kibi-codex hooks must not write to the .kb directory. The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer.'
logic_claims:
  - CLAIM-943C2A092AF02D7A
  - CLAIM-AF104ACFA3569D00
  - CLAIM-91829B71E8D267BD
  - CLAIM-2104EF055497A0C9
  - CLAIM-7A8F343AFD3A94F0
  - CLAIM-3100D36613C9179A
semantic_clauses:
  - The kibi-codex package must remain optional.
  - When kibi-codex is installed or enabled, it must not modify core Kibi runtime components.
  - The kibi-codex MCP launcher must start the project-local kibi-mcp binary.
  - 'kibi-codex hooks must never deny a tool call: they add reminders and warnings, and at Stop they ask the agent to continue.'
  - kibi-codex hooks must not write to the .kb directory.
  - The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ad02dbb0bc445e352660d818cbd2e0be4594b1054ec8830869e295a7b25a8a1a
semantic_inventory:
  - claim_key: CLAIM-943C2A092AF02D7A
    claim_text: The kibi-codex package must remain optional
    role: normative
    status: modeled
    span:
      start: 0
      end: 43
  - claim_key: CLAIM-AF104ACFA3569D00
    claim_text: When kibi-codex is installed or enabled, it must not modify core Kibi runtime components
    role: condition
    status: modeled
    span:
      start: 45
      end: 133
  - claim_key: CLAIM-91829B71E8D267BD
    claim_text: The kibi-codex MCP launcher must start the project-local kibi-mcp binary
    role: normative
    status: modeled
    span:
      start: 135
      end: 207
  - claim_key: CLAIM-2104EF055497A0C9
    claim_text: 'kibi-codex hooks must never deny a tool call: they add reminders and warnings, and at Stop they ask the agent to continue'
    role: normative
    status: modeled
    span:
      start: 209
      end: 330
  - claim_key: CLAIM-7A8F343AFD3A94F0
    claim_text: kibi-codex hooks must not write to the .kb directory
    role: normative
    status: modeled
    span:
      start: 332
      end: 384
  - claim_key: CLAIM-3100D36613C9179A
    claim_text: The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer
    role: normative
    status: modeled
    span:
      start: 386
      end: 502
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-30, approving the reworded hooks rule during the edge-case coverage review: hooks never deny a tool call, and at Stop they ask the agent to continue.'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:48:21.532Z'
firmness: firm
---
The kibi-codex package must remain optional. When kibi-codex is installed or enabled, it must not modify core Kibi runtime components. The kibi-codex MCP launcher must start the project-local kibi-mcp binary. kibi-codex hooks must never deny a tool call: they add reminders and warnings, and at Stop they ask the agent to continue. kibi-codex hooks must not write to the .kb directory. The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer.

## Context

kibi-codex integrates Kibi with Codex through a plugin manifest, bundled skills, advisory hooks and an MCP launcher. What the package publishes is stated in REQ-codex-plugin-package, where each claim is proved from the package files. This requirement keeps the adapter's runtime behaviour.

## Why this changed

The migrated statement was a single paragraph that the advisor read as one claim. On 2026-10-27 it was restated as one claim per sentence, and the packaging claims moved to REQ-codex-plugin-package so that they can be proved from the package files. The foundation claim is now the peer dependency claim there: kibi-codex declares kibi-cli and kibi-mcp, and kibi-cli brings kibi-core.

The Stop hook asks Codex to continue the turn once with a capture or signoff request, and PreToolUse returns allow with updated input for Kibi calls. On 2026-10-30 the hooks rule was reworded from only emitting reminders and warnings to never denying a tool call, so that it matches what the hooks do.
