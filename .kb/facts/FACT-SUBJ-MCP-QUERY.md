---
title: MCP Public Query Surface
status: active
tags:
  - strict-lane
  - mcp
fact_kind: subject
subject_key: mcp.public_surface.query
id: FACT-SUBJ-MCP-QUERY
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The kb_query public operation as exposed over MCP, including filtering entities by source file path so only entities whose source is that file are returned. It is the query surface, not the search ranking.
