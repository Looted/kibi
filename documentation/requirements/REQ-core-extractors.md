---
id: REQ-core-extractors
title: Markdown and YAML metadata extractors
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
source: REQ-007
priority: must
tags:
  - cli
  - extractors
  - sync
links:
  - type: supersedes
    target: REQ-007
---

Kibi extracts entities and relationships from source files using specialized extractors:
- Markdown extractor: Parses YAML frontmatter for core entity types and interprets Markdown links as `relates_to` edges.
- Symbol extractor: Parses `symbols.yaml` to import code symbol definitions into the KB.
Typed relationship objects in Markdown frontmatter are imported with their explicit types.
