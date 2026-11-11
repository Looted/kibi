---
title: Coordinate refreshes write only the local cache and settle after one run
status: open
semantic_text: Symbol coordinate refreshes must keep authored metadata in symbols.yaml and generated locations in symbol-coordinates.yaml. Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest.
semantic_clauses:
  - Symbol coordinate refreshes must keep authored metadata in symbols.yaml and generated locations in symbol-coordinates.yaml.
  - Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d98ae265151a0ee2df7100cecdb30b8c6b1ae5cd4abc91771576738315ef7c27
semantic_inventory:
  - claim_key: CLAIM-4CC3B142BC51AEA3
    claim_text: Symbol coordinate refreshes must keep authored metadata in symbols.yaml and generated locations in symbol-coordinates.yaml
    role: normative
    status: modeled
    span:
      start: 0
      end: 122
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-973E5C6674238256
    claim_text: Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest
    role: normative
    status: modeled
    span:
      start: 124
      end: 263
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-4CC3B142BC51AEA3
  - CLAIM-973E5C6674238256
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T06:53:15.625Z'
priority: must
firmness: firm
required_evidence: tested
tags:
  - cli
  - extractors
  - sync
id: REQ-kibi-coordinate-refresh-split
type: req
---
Symbol coordinate refreshes must keep authored metadata in symbols.yaml and generated locations in symbol-coordinates.yaml. Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest.

## Context

Moving code never shows up as a change to the authored manifest, so branches that edit the same file merge without manifest conflicts.

Sync is how authored Markdown and the symbols manifest become the KB, so what it imports has to be exactly what was written.

## Why this changed

Split from REQ-core-extractors, which held three behaviors: Markdown front matter and link import, symbols manifest import, and idempotent symbol coordinate refresh. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
