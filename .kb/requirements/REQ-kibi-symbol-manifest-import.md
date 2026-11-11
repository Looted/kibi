---
title: Sync imports exactly the symbols declared in symbols.yaml
status: open
semantic_text: The symbol extractor must import code symbol definitions from symbols.yaml into the KB.
semantic_clauses:
  - The symbol extractor must import code symbol definitions from symbols.yaml into the KB.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2108f579a9011d5070089687fcbff213e12e560cfc83493ea9d878f8ef5b46c4
semantic_inventory:
  - claim_key: CLAIM-2B61831A52C4F752
    claim_text: The symbol extractor must import code symbol definitions from symbols.yaml into the KB
    role: normative
    status: modeled
    span:
      start: 0
      end: 86
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-2B61831A52C4F752
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T06:52:53.674Z'
priority: must
firmness: firm
required_evidence: tested
tags:
  - cli
  - extractors
  - sync
id: REQ-kibi-symbol-manifest-import
type: req
---
The symbol extractor must import code symbol definitions from symbols.yaml into the KB.

## Context

The KB's symbols always match the authored manifest, so traceability never points at code the manifest no longer declares.

Sync is how authored Markdown and the symbols manifest become the KB, so what it imports has to be exactly what was written.

## Why this changed

Split from REQ-core-extractors, which held three behaviors: Markdown front matter and link import, symbols manifest import, and idempotent symbol coordinate refresh. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
