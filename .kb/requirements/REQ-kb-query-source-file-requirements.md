---
title: A lookup by file returns the requirements its symbols implement
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb_query
  - source-file
origin:
  kind: agent
  ref: 'Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 5 of 8: ''Approve all''.'
  approved_by: maintainer
  recorded_at: '2026-11-24T19:59:52.302Z'
rationale: In the crowded-store benchmark, kb_query with sourceFile and type req returned nothing in 5 of 5 calls, so an agent read a file whose code implements recorded rules as governed by none.
semantic_text: kb_query by sourceFile must return the requirements that the file's symbols implement, not only the entities whose own source is the file.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5037543975b3b6d0662400d844487ac603ef12d331c842cc51099a8840971970
semantic_inventory:
  - claim_key: CLAIM-19B3D3C4D96A396C
    claim_text: kb_query by sourceFile must return the requirements that the file's symbols implement, not only the entities whose own source is the file
    role: normative
    status: modeled
    span:
      start: 0
      end: 137
    subjects:
      - mcp.kb_query
logic_claims:
  - CLAIM-19B3D3C4D96A396C
id: REQ-kb-query-source-file-requirements
type: req
---
kb_query by sourceFile must return the requirements that the file's symbols implement, not only the entities whose own source is the file.

## Context

In the crowded-store benchmark, kb_query with sourceFile and type req returned nothing in 5 of 5 calls, so an agent read a file whose code implements recorded rules as governed by none.

## Source

> Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 5 of 8: 'Approve all'.
