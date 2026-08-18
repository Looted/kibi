---
id: REQ-mcp-semantic-advisor-preflight
title: MCP upsert preflight surfaces semantic advisor receipts
status: open
created_at: 2026-06-07T00:00:00Z
updated_at: 2026-06-07T00:00:00Z
source: packages/mcp/src/semantic-advisor/analyze-prose.ts
priority: high
tags:
  - mcp
  - semantic-advisor
  - modeling
links:
  - type: specified_by
    target: SCEN-mcp-semantic-advisor-preflight
  - type: verified_by
    target: TEST-mcp-semantic-advisor-preflight
---

The MCP server must analyze raw requirement prose and requirement upsert payloads for deterministic semantic modeling signals and return advisory receipts that guide agents toward strict facts, ontology predicates, ambiguity review, or ontology-gap observations before prose is treated as contradiction-checkable knowledge.
