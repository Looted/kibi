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
