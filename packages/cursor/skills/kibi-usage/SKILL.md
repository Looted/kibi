---
name: kibi-usage
description: Use Kibi MCP discovery tools to find relevant requirements and context before editing code.
---

## Goal

Help an agent discover existing knowledge in Kibi before making changes.

## MCP workflow

- Start with `kb_search` using domain keywords and requirement intent.
- Move to `kb_query` for exact entity retrieval by `id` or `type`.
- Use `kb_status` when context is stale or branch linkage is unclear.
- Use curated reports only when the question needs them: `kb_find_gaps`, `kb_coverage`, or `kb_graph`.
- Mutate only through `kb_upsert` or `kb_delete`, then validate with `kb_check`.

## Guidance

- Prefer source-linked lookups and traceability-aware retrieval via `kb_query` filters.
- Never open or patch files under `.kb/` directly.
- When unsure about scope, re-run `kb_search` with tighter terms, then validate with `kb_query`.
- Report the KB outcome before completion: updated, no-impact with rationale, or deferred/failed.
