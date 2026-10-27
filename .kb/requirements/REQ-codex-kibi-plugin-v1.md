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
semantic_text: The kibi-codex package must remain optional. When kibi-codex is installed or enabled, it must not modify core Kibi runtime components. The kibi-codex MCP launcher must start the project-local kibi-mcp binary. kibi-codex hooks must only emit reminders and warnings. kibi-codex hooks must not write to the .kb directory. The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer.
logic_claims:
  - CLAIM-943C2A092AF02D7A
  - CLAIM-AF104ACFA3569D00
  - CLAIM-91829B71E8D267BD
  - CLAIM-61D8A2DB5D464944
  - CLAIM-7A8F343AFD3A94F0
  - CLAIM-3100D36613C9179A
semantic_clauses:
  - The kibi-codex package must remain optional.
  - When kibi-codex is installed or enabled, it must not modify core Kibi runtime components.
  - The kibi-codex MCP launcher must start the project-local kibi-mcp binary.
  - kibi-codex hooks must only emit reminders and warnings.
  - kibi-codex hooks must not write to the .kb directory.
  - The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 71e52a81bc92a105cf2af66dfae509ce684663579276f6f1412fe3bf5211c41f
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
  - claim_key: CLAIM-61D8A2DB5D464944
    claim_text: kibi-codex hooks must only emit reminders and warnings
    role: normative
    status: modeled
    span:
      start: 209
      end: 263
  - claim_key: CLAIM-7A8F343AFD3A94F0
    claim_text: kibi-codex hooks must not write to the .kb directory
    role: normative
    status: modeled
    span:
      start: 265
      end: 317
  - claim_key: CLAIM-3100D36613C9179A
    claim_text: The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer
    role: normative
    status: modeled
    span:
      start: 319
      end: 435
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:48:21.532Z'
firmness: firm
---
The kibi-codex package must remain optional. When kibi-codex is installed or enabled, it must not modify core Kibi runtime components. The kibi-codex MCP launcher must start the project-local kibi-mcp binary. kibi-codex hooks must only emit reminders and warnings. kibi-codex hooks must not write to the .kb directory. The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer.

## Context

kibi-codex integrates Kibi with Codex through a plugin manifest, bundled skills, advisory hooks and an MCP launcher. What the package publishes is stated in REQ-codex-plugin-package, where each claim is proved from the package files. This requirement keeps the adapter's runtime behaviour.

## Why this changed

The migrated statement was a single paragraph that the advisor read as one claim. On 2026-10-27 it was restated as one claim per sentence, and the packaging claims moved to REQ-codex-plugin-package so that they can be proved from the package files. The foundation claim is now the peer dependency claim there: kibi-codex declares kibi-cli and kibi-mcp, and kibi-cli brings kibi-core.
