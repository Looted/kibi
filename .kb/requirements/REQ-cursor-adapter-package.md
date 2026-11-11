---
title: kibi-cursor is an optional package whose MCP launcher starts the project-local kibi-mcp
status: open
semantic_text: The kibi-cursor package must remain optional. When kibi-cursor is installed or enabled, it must not modify core Kibi runtime components. The kibi-cursor MCP launcher must start the project-local kibi-mcp binary. The kibi-cursor documentation must describe a manual MCP configuration for teams that do not use the plugin installer.
semantic_clauses:
  - The kibi-cursor package must remain optional.
  - When kibi-cursor is installed or enabled, it must not modify core Kibi runtime components.
  - The kibi-cursor MCP launcher must start the project-local kibi-mcp binary.
  - The kibi-cursor documentation must describe a manual MCP configuration for teams that do not use the plugin installer.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4cd3ee5bc0147eb0cf9b4dfc1824ac925f289702c74866f34aad4c96695e35f8
semantic_inventory:
  - claim_key: CLAIM-53B43B16D3EB8252
    claim_text: The kibi-cursor package must remain optional
    role: normative
    status: modeled
    span:
      start: 0
      end: 44
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-6B1861EAA48FF0C3
    claim_text: When kibi-cursor is installed or enabled, it must not modify core Kibi runtime components
    role: condition
    status: modeled
    span:
      start: 46
      end: 135
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-DBFE455AFAFC2F35
    claim_text: The kibi-cursor MCP launcher must start the project-local kibi-mcp binary
    role: normative
    status: modeled
    span:
      start: 137
      end: 210
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-25D92215ADE7D7CB
    claim_text: The kibi-cursor documentation must describe a manual MCP configuration for teams that do not use the plugin installer
    role: normative
    status: modeled
    span:
      start: 212
      end: 329
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-53B43B16D3EB8252
  - CLAIM-6B1861EAA48FF0C3
  - CLAIM-DBFE455AFAFC2F35
  - CLAIM-25D92215ADE7D7CB
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:00:54.224Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - kibi
  - cursor
  - plugin
  - mcp
owner: cursor-team
id: REQ-cursor-adapter-package
type: req
---
The kibi-cursor package must remain optional. When kibi-cursor is installed or enabled, it must not modify core Kibi runtime components. The kibi-cursor MCP launcher must start the project-local kibi-mcp binary. The kibi-cursor documentation must describe a manual MCP configuration for teams that do not use the plugin installer.

## Context

Teams can use Kibi in Cursor without the plugin, and the plugin never brings its own copy of Kibi.

kibi-cursor integrates Kibi with Cursor through a plugin manifest, rules, skills, commands, advisory hooks and an MCP launcher. What the package publishes is stated in REQ-cursor-plugin-package, where each claim is proved from the package files. This requirement keeps the adapter's runtime behaviour.

## Why this changed

Split from REQ-cursor-kibi-plugin-v1, which held two behaviors: the optional package with its MCP launcher, and the limits on what its hooks do. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
