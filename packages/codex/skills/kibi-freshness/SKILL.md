---
name: kibi-freshness
description: Check branch freshness and source linkage quality before decisions or risky writes.
---

## Goal

Help agents decide whether KB context is current enough to support safe changes.

## MCP workflow

- Use `kb_status` first to confirm branch attachment and freshness state.
- Use `kb_query` with `sourceFile`/text refs for source-linked discovery.
- Re-run `kb_search` after sync gaps are detected.
- If knowledge must change, update it with `kb_upsert` or `kb_delete` and finish with `kb_check`.

## Guidance

- Never proceed with broad changes when freshness is stale and unresolved.
- If entities look stale, prefer refreshing context via MCP flows and then re-query.
- Avoid direct `.kb` editing; use `kb_status` and other MCP checks instead.
- Completion must state one freshness outcome: KB updated, no KB impact with rationale, or deferred/failed.
