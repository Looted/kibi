---
id: TEST-prolog-library-adoption-mcp
title: MCP remote SPARQL handler validation tests
status: passing
created_at: 2026-06-02T00:00:00Z
updated_at: 2026-06-02T00:00:00Z
source: packages/mcp/tests/tools/sparql.test.ts
tags:
  - mcp
  - sparql
  - security
links:
  - type: validates
    target: SCEN-prolog-library-adoption
---

Verification covers argument validation, public remote endpoint restrictions, SELECT-only query enforcement, Prolog query construction, structured MCP responses, and error wrapping for `kb_sparql_remote`.
