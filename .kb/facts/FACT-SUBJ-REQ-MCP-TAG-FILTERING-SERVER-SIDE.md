---
title: kb_query restores server-side tag filtering after tag normalization
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: mcp.kb_query
canonical_key: req.req_mcp_tag_filtering_server_side
id: FACT-SUBJ-REQ-MCP-TAG-FILTERING-SERVER-SIDE
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The kb_query MCP tool for exact, filtered entity queries by type, id, tags, source and similar fields, with tag filtering done on the server after tag normalization. It returns matching entities, not ranked search results.
