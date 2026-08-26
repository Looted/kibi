---
id: REQ-cli-query
title: Filter and format KB output via command-line
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-05-13T10:00:00.000Z
source: REQ-003
priority: must
tags:
  - cli
  - query
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-001
  - type: verified_by
    target: TEST-003
semantic_text: The `kibi query` command provides CLI access to the knowledge base. It supports filtering by entity type, ID, tags, and source file. Output can be formatted as human-readable tables or machine-readable JSON. It also supports querying relationships for specific entities.
semantic_clauses:
  - The `kibi query` command provides CLI access to the knowledge base.
  - It supports filtering by entity type, ID, tags, and source file.
  - Output can be formatted as human-readable tables or machine-readable JSON.
  - It also supports querying relationships for specific entities.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: e614f687213d17f21123931e27e8470409df35b9ed59b2898feda3d0666d5ea5
logic_claims:
  - CLAIM-5447358E14FAFD65
  - CLAIM-44D864637CEE5FD5
  - CLAIM-E1BF29CD5D92382F
  - CLAIM-BB2FD915BB3BA695
semantic_inventory:
  - claim_key: CLAIM-5447358E14FAFD65
    claim_text: The `kibi query` command provides CLI access to the knowledge base
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 66
    payload_hash: 745ccd815c2d2460083f64cefba483ce9fc024c1f076147e6e5d905303614847
    reason: Grounded by FACT-cli-query-FAFD65 via requires_predicate.
  - claim_key: CLAIM-44D864637CEE5FD5
    claim_text: It supports filtering by entity type, ID, tags, and source file
    role: descriptive
    status: modeled
    span:
      start: 68
      end: 131
    payload_hash: 745ccd815c2d2460083f64cefba483ce9fc024c1f076147e6e5d905303614847
    reason: Grounded by FACT-cli-query-EE5FD5 via requires_predicate.
  - claim_key: CLAIM-E1BF29CD5D92382F
    claim_text: Output can be formatted as human-readable tables or machine-readable JSON
    role: descriptive
    status: modeled
    span:
      start: 133
      end: 206
    payload_hash: 745ccd815c2d2460083f64cefba483ce9fc024c1f076147e6e5d905303614847
    reason: Grounded by FACT-cli-query-92382F via requires_predicate.
  - claim_key: CLAIM-BB2FD915BB3BA695
    claim_text: It also supports querying relationships for specific entities
    role: descriptive
    status: modeled
    span:
      start: 208
      end: 269
    payload_hash: 745ccd815c2d2460083f64cefba483ce9fc024c1f076147e6e5d905303614847
    reason: Grounded by FACT-cli-query-3BA695 via requires_predicate.
type: req
---

The `kibi query` command provides CLI access to the knowledge base. It supports filtering by entity type, ID, tags, and source file.
Output can be formatted as human-readable tables or machine-readable JSON.
It also supports querying relationships for specific entities.
