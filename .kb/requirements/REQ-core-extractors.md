---
id: REQ-core-extractors
title: Markdown and YAML metadata extractors
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-08-02T00:00:00.000Z
source: REQ-007
priority: must
tags:
  - cli
  - extractors
  - sync
links:
  - type: supersedes
    target: REQ-007
  - type: specified_by
    target: SCEN-001
semantic_text: 'Kibi extracts entities and relationships from source files using specialized extractors:\nMarkdown extractor: Parses YAML frontmatter for core entity types and interprets Markdown links as `relates_to` edges.\nSymbol extractor: Parses `symbols.yaml` to import code symbol definitions into the KB.\nTyped relationship objects in Markdown frontmatter are imported with their explicit types.\n\nSymbol coordinate refreshes must keep authored metadata in `symbols.yaml` and generated locations in `symbol-coordinates.yaml`. Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest.'
logic_claims:
  - CLAIM-C2DE8571B0CEC508
  - CLAIM-973E5C6674238256
semantic_clauses:
  - 'Kibi extracts entities and relationships from source files using specialized extractors:\nMarkdown extractor: Parses YAML frontmatter for core entity types and interprets Markdown links as `relates_to` edges.\nSymbol extractor: Parses `symbols.yaml` to import code symbol definitions into the KB.\nTyped relationship objects in Markdown frontmatter are imported with their explicit types.\n\nSymbol coordinate refreshes must keep authored metadata in `symbols.yaml` and generated locations in `symbol-coordinates.yaml`'
  - Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: aaa3cbfdd09d1e0a563e3d7ce2543dd6a10b4b1e1f2c72cf4d03e5eab650f83b
semantic_inventory:
  - claim_key: CLAIM-C2DE8571B0CEC508
    claim_text: 'Kibi extracts entities and relationships from source files using specialized extractors:\nMarkdown extractor: Parses YAML frontmatter for core entity types and interprets Markdown links as `relates_to` edges.\nSymbol extractor: Parses `symbols.yaml` to import code symbol definitions into the KB.\nTyped relationship objects in Markdown frontmatter are imported with their explicit types.\n\nSymbol coordinate refreshes must keep authored metadata in `symbols.yaml` and generated locations in `symbol-coordinates.yaml`'
    role: normative
    status: modeled
    span:
      start: 0
      end: 518
  - claim_key: CLAIM-973E5C6674238256
    claim_text: Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest
    role: normative
    status: modeled
    span:
      start: 520
      end: 659
type: req
---

Kibi extracts entities and relationships from source files using specialized extractors:
- Markdown extractor: Parses YAML frontmatter for core entity types and interprets Markdown links as `relates_to` edges.
- Symbol extractor: Parses `symbols.yaml` to import code symbol definitions into the KB.
Typed relationship objects in Markdown frontmatter are imported with their explicit types.

Symbol coordinate refreshes must keep authored metadata in `symbols.yaml` and generated locations in `symbol-coordinates.yaml`. Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest.
