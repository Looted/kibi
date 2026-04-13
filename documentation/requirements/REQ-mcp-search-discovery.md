---
id: REQ-mcp-search-discovery
title: Curated discovery and reporting tools are available through MCP and CLI
status: open
created_at: 2026-03-22T00:00:00Z
updated_at: 2026-03-22T18:30:00Z
source: docs/superpowers/specs/2026-03-22-discovery-bundle-design.md
priority: must
tags:
  - mcp
  - cli
  - discovery
  - search
links:
  - type: specified_by
    target: SCEN-mcp-search-discovery
---

Kibi must provide a curated read-only discovery surface for both MCP and CLI.

The surface includes:

- free-text discovery with `kb_search` / `kibi search`
- freshness and snapshot inspection with `kb_status` / `kibi status`
- gap analysis with `kb_find_gaps` / `kibi gaps`
- coverage reporting with `kb_coverage` / `kibi coverage`
- bounded relationship traversal with `kb_graph` / `kibi graph`

`kb_query` remains exact and deterministic and must not be turned into fuzzy search.
