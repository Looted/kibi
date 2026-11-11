---
title: kibi-claude adds linked requirement IDs before a read or edit, once per file per session
status: open
semantic_text: When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context. kibi-claude hooks must add at most one knowledge snippet per file per session.
semantic_clauses:
  - When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context.
  - kibi-claude hooks must add at most one knowledge snippet per file per session.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d3a3b6bab126e0b1ae5d6dd01796c0a87ddfa158a41d61bfebf4c708658c6dd0
semantic_inventory:
  - claim_key: CLAIM-86B85730B99AF0C9
    claim_text: When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context
    role: condition
    status: modeled
    span:
      start: 0
      end: 178
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B8B9B523CCC37CE5
    claim_text: kibi-claude hooks must add at most one knowledge snippet per file per session
    role: normative
    status: modeled
    span:
      start: 180
      end: 257
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-86B85730B99AF0C9
  - CLAIM-B8B9B523CCC37CE5
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:33:46.957Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - claude-code
  - plugin
  - hooks
  - progressive-disclosure
id: REQ-claude-linked-requirement-context
type: req
---
When the agent is about to read or edit a source file whose symbols are linked to requirements, kibi-claude hooks must add the linked requirement identifiers to the agent context. kibi-claude hooks must add at most one knowledge snippet per file per session.

## Context

The agent sees which requirements a file serves before it changes the file, without the same note repeating.

What the kibi-claude package ships (its manifest, skills, MCP configuration and lifecycle hooks) is stated in REQ-claude-plugin-package, where each claim is proved from the package files. This requirement keeps the runtime behaviour of the hooks and the MCP endpoint.

## Why this changed

Split from REQ-claude-code-kibi-plugin-v1, which held four behaviors: staying an isolated, advisory package, staying silent in a project without a knowledge base, adding linked requirement context, and the stop reminder with the firm-edit ask. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
