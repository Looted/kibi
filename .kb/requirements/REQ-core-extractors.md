---
id: REQ-core-extractors
title: Markdown and YAML metadata extractors
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-08-02T00:00:00Z
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
---

Kibi extracts entities and relationships from source files using specialized extractors:
- Markdown extractor: Parses YAML frontmatter for core entity types and interprets Markdown links as `relates_to` edges.
- Symbol extractor: Parses `symbols.yaml` to import code symbol definitions into the KB.
Typed relationship objects in Markdown frontmatter are imported with their explicit types.

Symbol coordinate refreshes must keep authored metadata in `symbols.yaml` and generated locations in `symbol-coordinates.yaml`. Consecutive refreshes over unchanged sources must be idempotent and must not alternate generated coordinate fields in the authored manifest.
