---
id: REQ-core-persistence
title: RDF persistence using SWI-Prolog rdf_persistency library
status: open
created_at: 2026-05-13T10:00:00Z
updated_at: 2026-05-13T10:00:00Z
source: REQ-009
priority: must
tags:
  - core
  - prolog
  - storage
links:
  - type: supersedes
    target: REQ-009
  - type: specified_by
    target: SCEN-001
  - type: verified_by
    target: TEST-007
---

Kibi's knowledge base is persisted on disk using the SWI-Prolog `rdf_persistency` library.
Entities and relationships are stored as RDF triples in a branch-specific `.kb/branches/<branch>/kb.rdf` file.
The storage layer handles file locking to prevent corruption during concurrent access.
