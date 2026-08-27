---
id: SCEN-mcp-tag-filtering-server-side
title: Tag-filtered kb_query uses server-side matching without a full entity scan
status: active
created_at: 2026-08-18T00:00:00Z
updated_at: 2026-08-18T00:00:00Z
source: documentation/scenarios/SCEN-mcp-tag-filtering-server-side.md
tags: [mcp, query, tags, normalization]
links:
  - type: verified_by
    target: TEST-mcp-tag-filtering-server-side
---

Given entities whose tags are stored in mixed or legacy list formats, when kb_query is called with a tags filter, then matching is any-of the provided tags, results match the previous public semantics, and the query path does not fetch every entity solely to apply the filter.
