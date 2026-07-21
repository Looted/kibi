---
id: kibi-traceability
name: kibi-traceability
description: Maintain requirement, scenario, and test traceability through Kibi MCP tools.
version: 1.0.0
kibiCompatibility: "*"
tags:
  - kibi
  - mcp
  - traceability
  - agent-guidance
---

## Goal

Validate and strengthen traceability before and after code changes.

## MCP workflow

- Locate requirements with `kb_search` and inspect exact details with `kb_query`.
- After meaningful source edits, run `kb_check({sourceFiles:[...], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})` before deciding whether traceability is current.
- Apply updates with `kb_upsert` for requirements, scenarios, tests, or facts.
- Validate constraints and consistency with `kb_check`.

## Guidance

- Prefer source-linked relationships so symbols and files can be traced back cleanly.
- Treat `symbol_semantic_review_needed` as a prompt to inspect linked requirements/tests; Kibi reports graph links but does not prove prose semantics.
- Include `kb_query` and `kb_delete` only when explicit cleanups are required.
- Never directly edit `.kb/**`; all modeling and cleanup goes through MCP tools.
- Preserve the canonical chain `REQ-* -> SCEN-* -> TEST-*` when adding or changing requirements.
- Production symbols should implement requirements; test symbols should remain executable evidence for tests.
