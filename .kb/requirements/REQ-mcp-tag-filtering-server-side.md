---
id: REQ-mcp-tag-filtering-server-side
title: kb_query restores server-side tag filtering after tag normalization
status: open
created_at: 2026-03-21T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
priority: should
source: documentation/requirements/REQ-mcp-tag-filtering-server-side.md
tags:
  - mcp
  - query
  - tags
  - normalization
  - performance
links:
  - type: specified_by
    target: SCEN-mcp-tag-filtering-server-side
  - type: relates_to
    target: REQ-002
type: req
semantic_text: kb_query must apply tag filters in the Prolog query path. Matching any provided tag must return the entity. Tag list representations must be normalized consistently so server-side filtering matches client-side filtering. MCP must not fall back to JavaScript tag filtering once tag normalization is reliable.
logic_claims:
  - CLAIM-AE25F6619F8E8F0A
  - CLAIM-E9F7BACF455C22D5
  - CLAIM-7DF8E6986A498C38
  - CLAIM-1723C5882A71BA2F
semantic_clauses:
  - kb_query must apply tag filters in the Prolog query path
  - Matching any provided tag must return the entity
  - Tag list representations must be normalized consistently so server-side filtering matches client-side filtering
  - MCP must not fall back to JavaScript tag filtering once tag normalization is reliable
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 71c10885481c275ce25fbf3be365f942c7149a582bbdd0298950cdbb4802ad0a
semantic_inventory:
  - claim_key: CLAIM-AE25F6619F8E8F0A
    claim_text: kb_query must apply tag filters in the Prolog query path
    role: normative
    status: modeled
    span:
      start: 0
      end: 56
  - claim_key: CLAIM-E9F7BACF455C22D5
    claim_text: Matching any provided tag must return the entity
    role: normative
    status: modeled
    span:
      start: 58
      end: 106
  - claim_key: CLAIM-7DF8E6986A498C38
    claim_text: Tag list representations must be normalized consistently so server-side filtering matches client-side filtering
    role: normative
    status: modeled
    span:
      start: 108
      end: 219
  - claim_key: CLAIM-1723C5882A71BA2F
    claim_text: MCP must not fall back to JavaScript tag filtering once tag normalization is reliable
    role: normative
    status: modeled
    span:
      start: 221
      end: 306
---

## Overview

`kb_query` already accepts a `tags` filter, but the MCP implementation currently falls back to fetching entities and filtering them in JavaScript because tag list normalization is not yet reliable across stored formats.

## Requirements

1. Restore server-side tag filtering in the Prolog query path once tag normalization is reliable.
2. Preserve the current public semantics: matching any provided tag returns the entity.
3. Normalize tag list representations consistently so server-side filtering behaves the same as the current JavaScript fallback.
4. Avoid full-entity scans for tag-filtered queries when server-side filtering is available.

## Success Criteria

- `kb_query` with `tags` returns the same results before and after the server-side implementation change.
- Mixed or legacy tag list formats no longer force JavaScript-side fallback.
- Large knowledge bases do not require fetching every entity just to apply tag filters.
