---
title: kibi-codex is an optional package whose MCP launcher starts the project-local kibi-mcp
status: open
semantic_text: The kibi-codex package must remain optional. When kibi-codex is installed or enabled, it must not modify core Kibi runtime components. The kibi-codex MCP launcher must start the project-local kibi-mcp binary. The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer.
semantic_clauses:
  - The kibi-codex package must remain optional.
  - When kibi-codex is installed or enabled, it must not modify core Kibi runtime components.
  - The kibi-codex MCP launcher must start the project-local kibi-mcp binary.
  - The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: efb999551b4e4b833b86be8862764b62e3ea3fe23dcd69bb5cb88f0615890fa8
semantic_inventory:
  - claim_key: CLAIM-943C2A092AF02D7A
    claim_text: The kibi-codex package must remain optional
    role: normative
    status: modeled
    span:
      start: 0
      end: 43
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-AF104ACFA3569D00
    claim_text: When kibi-codex is installed or enabled, it must not modify core Kibi runtime components
    role: condition
    status: modeled
    span:
      start: 45
      end: 133
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-91829B71E8D267BD
    claim_text: The kibi-codex MCP launcher must start the project-local kibi-mcp binary
    role: normative
    status: modeled
    span:
      start: 135
      end: 207
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-3100D36613C9179A
    claim_text: The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer
    role: normative
    status: modeled
    span:
      start: 209
      end: 325
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-943C2A092AF02D7A
  - CLAIM-AF104ACFA3569D00
  - CLAIM-91829B71E8D267BD
  - CLAIM-3100D36613C9179A
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T09:48:28.379Z'
priority: must
firmness: firm
tags:
  - kibi
  - codex
  - plugin
  - mcp
  - review:context-missing
owner: codex-team
id: REQ-codex-adapter-package
type: req
---
The kibi-codex package must remain optional. When kibi-codex is installed or enabled, it must not modify core Kibi runtime components. The kibi-codex MCP launcher must start the project-local kibi-mcp binary. The kibi-codex documentation must describe a manual MCP configuration for teams that do not use the plugin installer.

## Context

Teams can use Kibi in Codex without the plugin, and the plugin never brings its own copy of Kibi.

kibi-codex integrates Kibi with Codex through a plugin manifest, bundled skills, advisory hooks and an MCP launcher. What the package publishes is stated in REQ-codex-plugin-package, where each claim is proved from the package files. This requirement keeps the adapter's runtime behaviour.

## Why this changed

Split from REQ-codex-kibi-plugin-v1, which held two behaviors: the optional package with its MCP launcher, and the limits on what its hooks do. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
