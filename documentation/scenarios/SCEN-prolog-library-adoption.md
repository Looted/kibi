---
id: SCEN-prolog-library-adoption
title: Prolog library adoption preserves local KB behavior while exposing bounded remote SPARQL
status: active
created_at: 2026-06-02T00:00:00Z
updated_at: 2026-06-02T00:00:00Z
source: docs/mcp-reference.md
tags:
  - prolog
  - mcp
  - sparql
  - chr
links:
  - type: verified_by
    target: TEST-prolog-library-adoption-core
  - type: verified_by
    target: TEST-prolog-library-adoption-mcp
---

Given a branch-local Kibi knowledge base backed by Prolog
When maintained Prolog libraries are introduced for aggregate counting, CHR-derived validation facts, or remote SPARQL access
Then local KB inference remains deterministic, derived CHR behavior stays isolated and parity-tested, and remote SPARQL calls are validated before the MCP server dispatches them.
