---
id: kibi-freshness
name: kibi-freshness
description: Check branch freshness and source linkage quality before decisions or risky writes.
version: 1.0.0
kibiCompatibility: "*"
tags:
  - kibi
  - mcp
  - freshness
  - agent-guidance
---

## Goal

Help agents decide whether KB context is current enough to support safe changes.

## Interface Selection

1. If Kibi MCP tools are positively visible and approved, use MCP.
2. Otherwise, in a trusted workspace, use the project-local CLI through `npx --no-install kibi ...` or `bunx --no-install kibi ...`.
3. If the CLI is unavailable or too old, stop and tell the operator to enable or install Kibi.
4. Never use a global fallback or an installing runner.

Use `kibi-usage/resources/operation-access.md` for exact dedicated routes. A project-local CLI freshness check is executable as:

```bash
echo '{}' | npx --no-install kibi status --input -
```

## Capability workflow

- Use `kb_status`, or `status --input`, first to confirm branch attachment and freshness state.
- Use `kb_query`, or `query --input`, with `sourceFile`/text refs for source-linked discovery.
- Re-run `kb_search`, or `search --input`, after sync gaps are detected.
- If knowledge must change, use the selected interface's `kb_upsert`/`upsert` or `kb_delete`/`delete` operation sequentially and finish with `kb_check`/`check`.

## Guidance

- Never proceed with broad changes when freshness is stale and unresolved.
- If entities look stale, refresh context through an approved Kibi capability and then re-query.
- Avoid direct `.kb` editing; use the selected Kibi interface instead.
- Completion must state one freshness outcome: KB updated, no KB impact with rationale, or deferred/failed.
