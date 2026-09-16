---
id: REQ-mcp-search-discovery
title: Curated discovery and reporting tools are available through MCP and CLI
status: open
created_at: 2026-03-22T00:00:00.000Z
updated_at: 2026-03-22T18:30:00.000Z
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
  - type: verified_by
    target: TEST-mcp-search-discovery
semantic_text: Kibi must provide a curated read-only discovery surface for both MCP and CLI.\n\nThe surface includes:\n\nfree-text discovery with `kb_search` / `kibi search`\nfreshness and snapshot inspection with `kb_status` / `kibi status`\ngap analysis with `kb_find_gaps` / `kibi gaps`\ncoverage reporting with `kb_coverage` / `kibi coverage`\nbounded relationship traversal with `kb_graph` / `kibi graph`\n\n`kb_query` remains exact and deterministic and must not be turned into fuzzy search.
logic_claims:
  - CLAIM-1EE36481C9040D49
semantic_clauses:
  - Kibi must provide a curated read-only discovery surface for both MCP and CLI.\n\nThe surface includes:\n\nfree-text discovery with `kb_search` / `kibi search`\nfreshness and snapshot inspection with `kb_status` / `kibi status`\ngap analysis with `kb_find_gaps` / `kibi gaps`\ncoverage reporting with `kb_coverage` / `kibi coverage`\nbounded relationship traversal with `kb_graph` / `kibi graph`\n\n`kb_query` remains exact and deterministic and must not be turned into fuzzy search
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: aabf5e52dd50cdadf6bb870b39db4ace506c87177d2ee78db59c7c03cf19ea56
semantic_inventory:
  - claim_key: CLAIM-1EE36481C9040D49
    claim_text: Kibi must provide a curated read-only discovery surface for both MCP and CLI.\n\nThe surface includes:\n\nfree-text discovery with `kb_search` / `kibi search`\nfreshness and snapshot inspection with `kb_status` / `kibi status`\ngap analysis with `kb_find_gaps` / `kibi gaps`\ncoverage reporting with `kb_coverage` / `kibi coverage`\nbounded relationship traversal with `kb_graph` / `kibi graph`\n\n`kb_query` remains exact and deterministic and must not be turned into fuzzy search
    role: normative
    status: modeled
    span:
      start: 0
      end: 481
type: req
---

Kibi must provide a curated read-only discovery surface for both MCP and CLI.

The surface includes:

- free-text discovery with `kb_search` / `kibi search`
- freshness and snapshot inspection with `kb_status` / `kibi status`
- gap analysis with `kb_find_gaps` / `kibi gaps`
- coverage reporting with `kb_coverage` / `kibi coverage`
- bounded relationship traversal with `kb_graph` / `kibi graph`

`kb_query` remains exact and deterministic and must not be turned into fuzzy search.
