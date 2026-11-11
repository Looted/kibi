---
title: Sync imports Markdown front matter and its plain and typed links exactly
status: open
semantic_text: The Markdown extractor must parse YAML front matter for the core entity types and import Markdown links as relates_to edges. Typed relationship objects in Markdown front matter must be imported with their explicit types.
semantic_clauses:
  - The Markdown extractor must parse YAML front matter for the core entity types and import Markdown links as relates_to edges.
  - Typed relationship objects in Markdown front matter must be imported with their explicit types.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e54fb8f9e61b0464f02e9ce91ddde26cc494cdb40a36a6dead20fc89b03f583f
semantic_inventory:
  - claim_key: CLAIM-B6CFD3F2FE7ACA69
    claim_text: The Markdown extractor must parse YAML front matter for the core entity types and import Markdown links as relates_to edges
    role: normative
    status: modeled
    span:
      start: 0
      end: 123
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-032A21035746B5BE
    claim_text: Typed relationship objects in Markdown front matter must be imported with their explicit types
    role: normative
    status: modeled
    span:
      start: 125
      end: 219
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-B6CFD3F2FE7ACA69
  - CLAIM-032A21035746B5BE
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T06:52:06.110Z'
priority: must
firmness: firm
required_evidence: tested
tags:
  - cli
  - extractors
  - sync
id: REQ-kibi-markdown-frontmatter-import
type: req
---
The Markdown extractor must parse YAML front matter for the core entity types and import Markdown links as relates_to edges. Typed relationship objects in Markdown front matter must be imported with their explicit types.

## Context

A link written in front matter reaches the KB with the type its author gave it, and a type outside the vocabulary is refused rather than guessed.

Sync is how authored Markdown and the symbols manifest become the KB, so what it imports has to be exactly what was written.

## Why this changed

Split from REQ-core-extractors, which held three behaviors: Markdown front matter and link import, symbols manifest import, and idempotent symbol coordinate refresh. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
