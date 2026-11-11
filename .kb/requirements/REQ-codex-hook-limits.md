---
title: kibi-codex hooks never deny a tool call and never write to .kb
status: open
semantic_text: 'kibi-codex hooks must never deny a tool call: they add reminders and warnings, and at Stop they ask the agent to continue. kibi-codex hooks must not write to the .kb directory.'
semantic_clauses:
  - 'kibi-codex hooks must never deny a tool call: they add reminders and warnings, and at Stop they ask the agent to continue.'
  - kibi-codex hooks must not write to the .kb directory.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 65c8862d5e46a0935a1bf3470846f47e0fa2bbe9054cb0116a208766de2dbf10
semantic_inventory:
  - claim_key: CLAIM-2104EF055497A0C9
    claim_text: 'kibi-codex hooks must never deny a tool call: they add reminders and warnings, and at Stop they ask the agent to continue'
    role: normative
    status: modeled
    span:
      start: 0
      end: 121
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-7A8F343AFD3A94F0
    claim_text: kibi-codex hooks must not write to the .kb directory
    role: normative
    status: modeled
    span:
      start: 123
      end: 175
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-2104EF055497A0C9
  - CLAIM-7A8F343AFD3A94F0
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T09:49:12.455Z'
priority: must
firmness: firm
tags:
  - kibi
  - codex
  - plugin
  - mcp
owner: codex-team
id: REQ-codex-hook-limits
type: req
---
kibi-codex hooks must never deny a tool call: they add reminders and warnings, and at Stop they ask the agent to continue. kibi-codex hooks must not write to the .kb directory.

## Context

Hooks only advise, and their session state lives outside the knowledge base.

kibi-codex integrates Kibi with Codex through a plugin manifest, bundled skills, advisory hooks and an MCP launcher. What the package publishes is stated in REQ-codex-plugin-package, where each claim is proved from the package files. This requirement keeps the adapter's runtime behaviour.

## Why this changed

Split from REQ-codex-kibi-plugin-v1, which held two behaviors: the optional package with its MCP launcher, and the limits on what its hooks do. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
