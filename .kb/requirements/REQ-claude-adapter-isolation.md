---
title: kibi-claude is optional, leaves core Kibi alone, and its hooks never call the CLI or deny a tool call
status: open
semantic_text: The kibi-claude package must remain optional. When kibi-claude is installed or enabled, it must not modify core Kibi runtime components. When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine. When a kibi-claude hook runs, it must not deny a tool call.
semantic_clauses:
  - The kibi-claude package must remain optional.
  - When kibi-claude is installed or enabled, it must not modify core Kibi runtime components.
  - When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine.
  - When a kibi-claude hook runs, it must not deny a tool call.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 20a02216a9658dee6f42ca185db769d9b8710a1da5e94bf2b49e9f1a8ca667dd
semantic_inventory:
  - claim_key: CLAIM-94B3A133D10BFB98
    claim_text: The kibi-claude package must remain optional
    role: normative
    status: modeled
    span:
      start: 0
      end: 44
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-33E4D5BB01AD55FF
    claim_text: When kibi-claude is installed or enabled, it must not modify core Kibi runtime components
    role: condition
    status: modeled
    span:
      start: 46
      end: 135
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-7B062DA2D111C910
    claim_text: When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine
    role: condition
    status: modeled
    span:
      start: 137
      end: 217
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-EB2FC292489174F2
    claim_text: When a kibi-claude hook runs, it must not deny a tool call
    role: condition
    status: modeled
    span:
      start: 219
      end: 277
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-94B3A133D10BFB98
  - CLAIM-33E4D5BB01AD55FF
  - CLAIM-7B062DA2D111C910
  - CLAIM-EB2FC292489174F2
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:31:15.943Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - claude-code
  - plugin
  - hooks
  - progressive-disclosure
  - review:context-missing
id: REQ-claude-adapter-isolation
type: req
---
The kibi-claude package must remain optional. When kibi-claude is installed or enabled, it must not modify core Kibi runtime components. When a kibi-claude hook runs, it must not invoke the Kibi CLI or the Kibi engine. When a kibi-claude hook runs, it must not deny a tool call.

## Context

Hooks read the committed manifest directly, so they stay fast and never start the engine or deny a call.

What the kibi-claude package ships (its manifest, skills, MCP configuration and lifecycle hooks) is stated in REQ-claude-plugin-package, where each claim is proved from the package files. This requirement keeps the runtime behaviour of the hooks and the MCP endpoint.

## Why this changed

Split from REQ-claude-code-kibi-plugin-v1, which held four behaviors: staying an isolated, advisory package, staying silent in a project without a knowledge base, adding linked requirement context, and the stop reminder with the firm-edit ask. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
