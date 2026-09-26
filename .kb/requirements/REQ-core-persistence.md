---
id: REQ-core-persistence
title: RDF persistence using SWI-Prolog rdf_persistency library
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-05-13T10:00:00.000Z
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
semantic_text: |-
  Kibi's knowledge base is persisted on disk using the SWI-Prolog `rdf_persistency` library.
  Entities and relationships are stored as RDF triples in a branch-specific `.kb/branches/<branch>/kb.rdf` file.
  The storage layer handles file locking to prevent corruption during concurrent access.

  Replacement of the branch KB on disk must be detectable from MCP attachment state so that stale in-memory/attached views are not used after external sync operations.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 38a6682ba51ad7e192a94bf3a7ed0b485cdcc2a8dfa38f300127a7c06f44f355
semantic_inventory:
  - claim_key: CLAIM-A262DE9648D07D9D
    claim_text: Kibi's knowledge base is persisted on disk using the SWI-Prolog `rdf_persistency` library
    role: descriptive
    status: missing
    span:
      start: 0
      end: 89
    payload_hash: f8be2ed248f646f4e78005fa8f6ab144f057b1010cfae8c5faf7de5c197b1c00
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-B3A5B86B5E4D4298
    claim_text: Entities and relationships are stored as RDF triples in a branch-specific `.kb/branches/<branch>/kb.rdf` file
    role: descriptive
    status: missing
    span:
      start: 91
      end: 200
    payload_hash: f8be2ed248f646f4e78005fa8f6ab144f057b1010cfae8c5faf7de5c197b1c00
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-769054E19123AAE0
    claim_text: The storage layer handles file locking to prevent corruption during concurrent access
    role: descriptive
    status: missing
    span:
      start: 202
      end: 287
    payload_hash: f8be2ed248f646f4e78005fa8f6ab144f057b1010cfae8c5faf7de5c197b1c00
    reason: No accepted typed interpretation grounds this assertive proposition.
  - claim_key: CLAIM-24B213340E7C4B0B
    claim_text: Replacement of the branch KB on disk must be detectable from MCP attachment state so that stale in-memory/attached views are not used after external sync operations
    role: rationale
    status: nonlogical
    span:
      start: 290
      end: 454
    payload_hash: f8be2ed248f646f4e78005fa8f6ab144f057b1010cfae8c5faf7de5c197b1c00
    reason: Prose is retained for human context but does not assert a verifiable domain proposition.
logic_claims:
  - CLAIM-A262DE9648D07D9D
  - CLAIM-B3A5B86B5E4D4298
  - CLAIM-769054E19123AAE0
type: req
---

Kibi's knowledge base is persisted on disk using the SWI-Prolog `rdf_persistency` library.
Entities and relationships are stored as RDF triples in a branch-specific `.kb/branches/<branch>/kb.rdf` file.
The storage layer handles file locking to prevent corruption during concurrent access.

Replacement of the branch KB on disk must be detectable from MCP attachment state so that stale in-memory/attached views are not used after external sync operations.
