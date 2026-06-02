---
name: kibi-traceability
description: Maintain requirement, scenario, and test traceability through Kibi MCP tools.
---

## Goal

Validate and strengthen traceability before and after code changes.

## MCP workflow

- Locate requirements with `kb_search` and inspect exact details with `kb_query`.
- Apply updates with `kb_upsert` for requirements, scenarios, tests, or facts.
- Validate constraints and consistency with `kb_check`.

## Guidance

- Prefer source-linked relationships so symbols and files can be traced back cleanly.
- Include `kb_query` and `kb_delete` only when explicit cleanups are required.
- Never directly edit `.kb/**`; all modeling and cleanup goes through MCP tools.
- Preserve the canonical chain `REQ-* -> SCEN-* -> TEST-*` when adding or changing requirements.
- Production symbols should implement requirements; test symbols should remain executable evidence for tests.
