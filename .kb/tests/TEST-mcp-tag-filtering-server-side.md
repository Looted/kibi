---
id: TEST-mcp-tag-filtering-server-side
title: Tag-filtered kb_query matches any provided tag
status: active
created_at: 2026-08-18T00:00:00Z
updated_at: 2026-08-18T00:00:00Z
source: packages/cli/tests/operations/discovery.test.ts
tags: [mcp, query, tags, unit]
verification_scope: unit
verification_perspective: internal
links:
  - type: validates
    target: SCEN-mcp-tag-filtering-server-side
---

Asserts that `kb_query` with a `tags` filter keeps any-of matching semantics and applies the filter before pagination. Executable coverage spans `packages/cli/tests/operations/discovery.test.ts` and `packages/mcp/tests/tools/query.test.ts`.
