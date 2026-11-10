---
title: kibi-zcode stays silent in a project that owns no knowledge base
status: open
semantic_text: When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output. When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools.
semantic_clauses:
  - When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output.
  - When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7d5c9330bdd4bd6db37463e3f19b85c022bf5b9d118a14bce5b511a96ab8d54b
semantic_inventory:
  - claim_key: CLAIM-D736785D7DF3106F
    claim_text: When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output
    role: condition
    status: modeled
    span:
      start: 0
      end: 99
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-A0E2B1D45E38797C
    claim_text: When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools
    role: condition
    status: modeled
    span:
      start: 101
      end: 212
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-D736785D7DF3106F
  - CLAIM-A0E2B1D45E38797C
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T10:16:00.101Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - kibi
  - zcode
  - plugin
  - mcp
id: REQ-zcode-unowned-workspace-silence
type: req
---
When the resolved project root does not own .kb/manifest.json, kibi-zcode hooks must emit no output. When the resolved project root does not own .kb/manifest.json, the kibi-zcode MCP endpoint must expose no tools.

## Context

A ZCode session in a project that never opted into Kibi sees no hook output and no Kibi tools.

kibi-zcode is an optional ZCode adapter. Its hooks give advisory reminders and warnings only: they never write directly to .kb and never replace MCP tooling. The package is documented as optional and describes a supported manual MCP configuration. Its scope is declarative plugin assets and advisory hooks; the Kibi git hooks installed by kibi init keep ownership of hard enforcement.

What the package ships (its manifest, bootstrap command, skills, MCP launcher and lifecycle hooks) is stated in REQ-zcode-plugin-package, where each claim is proved from the package files.

## Why this changed

Split from REQ-zcode-kibi-plugin-v1, which held two behaviors: the optional package backed by the project-local Kibi packages, and staying silent in a project without a knowledge base. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
