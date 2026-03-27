---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-opencode": patch
---

Add typed fact schema, semantic contradiction model, and discovery bundle tools.

- **Typed facts**: New `fact_kind` field (subject, property_value, observation, meta) with schema validation, preserved through CLI/MCP sync and query round-trips.
- **Discovery bundle**: `kb_search`, `kb_find_gaps`, `kb_coverage`, `kb_graph` tools across MCP and CLI. Richer `kb_check` summaries and improved diagnostic usage logging.
- **Agent guidance**: Updated to prefer discovery-first workflows (`kb_search` → `kb_query`), MCP-only policy aligned with ADR-016 thin-bridge architecture.
- **Strict-fact validation**: Append-only requirement supersession and migration guidance for strict fact adoption.
