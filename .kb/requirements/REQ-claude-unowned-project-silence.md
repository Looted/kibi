---
title: kibi-claude stays silent and serves no tools in a project without a Kibi manifest
status: open
semantic_text: When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output. When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools.
semantic_clauses:
  - When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output.
  - When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 344493aec7461e6cc8769b95261936e97977382861532727679322efdcc715fd
semantic_inventory:
  - claim_key: CLAIM-B0C7CD09A216CE9D
    claim_text: When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output
    role: condition
    status: modeled
    span:
      start: 0
      end: 100
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-882BAB3F3C3572F9
    claim_text: When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools
    role: condition
    status: modeled
    span:
      start: 102
      end: 214
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-B0C7CD09A216CE9D
  - CLAIM-882BAB3F3C3572F9
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:32:46.982Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - claude-code
  - plugin
  - hooks
  - progressive-disclosure
id: REQ-claude-unowned-project-silence
type: req
---
When the resolved project root does not own .kb/manifest.json, kibi-claude hooks must emit no output. When the resolved project root does not own .kb/manifest.json, the kibi-claude MCP endpoint must expose no tools.

## Context

A project that never opted into Kibi sees no hook output and no Kibi tools.

What the kibi-claude package ships (its manifest, skills, MCP configuration and lifecycle hooks) is stated in REQ-claude-plugin-package, where each claim is proved from the package files. This requirement keeps the runtime behaviour of the hooks and the MCP endpoint.

## Why this changed

Split from REQ-claude-code-kibi-plugin-v1, which held four behaviors: staying an isolated, advisory package, staying silent in a project without a knowledge base, adding linked requirement context, and the stop reminder with the firm-edit ask. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
