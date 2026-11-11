---
title: The .kb manifest, not a leftover config, marks a project as initialized
status: open
semantic_text: MCP workspace activation and Cursor hook readiness must treat .kb/manifest.json as the initialized project signal, not leftover .kb/config.json.
semantic_clauses:
  - MCP workspace activation and Cursor hook readiness must treat .kb/manifest.json as the initialized project signal, not leftover .kb/config.json
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c763f7f4f36a991b8f41a95d5e76219f3fa543ab01dbe046932222ead591cd64
semantic_inventory:
  - claim_key: CLAIM-43BD9C7F35E8F20D
    claim_text: MCP workspace activation and Cursor hook readiness must treat .kb/manifest.json as the initialized project signal, not leftover .kb/config.json
    role: normative
    status: modeled
    span:
      start: 0
      end: 143
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-43BD9C7F35E8F20D
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T05:16:21.149Z'
priority: must
tags:
  - mcp
  - cursor
  - canonical-layout
firmness: firm
id: REQ-kibi-manifest-initialized-signal
type: req
---
MCP workspace activation and Cursor hook readiness must treat .kb/manifest.json as the initialized project signal, not leftover .kb/config.json.

## Context

Every host agrees on one readiness signal, so a project left half-migrated is offered init instead of being treated as ready.

ADR-026 fixes the canonical .kb/ project contract. Scaffolding itself remains REQ-cli-init-canonical.

## Why this changed

Split from REQ-cli-canonical-runtime, which held three behaviors: sync discovery of the canonical knowledge lanes, canonical source authoring with the derived-tree ignore policy, and the manifest as the initialized project signal. Each child is one of them. Symbol coordinate refresh, staged file listing and legacy storage migration moved to the requirements that decide them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
