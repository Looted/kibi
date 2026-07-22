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

## Interface Selection

1. If Kibi MCP tools are positively visible and approved, use MCP.
2. Otherwise, in a trusted workspace, use the project-local CLI through `npx --no-install kibi ...` or `bunx --no-install kibi ...`.
3. If the CLI is unavailable or too old, stop and tell the operator to enable or install Kibi.
4. Never use a global fallback or an installing runner.

Use `kibi-usage/resources/operation-access.md` for exact routes and JSON input. For example, run impact diagnostics through the dedicated project-local CLI route with:

```bash
echo '{"sourceFiles":["src/auth/login.ts"],"includeImpactDiagnostics":true,"includeWorkingTreeDiff":true}' | npx --no-install kibi check --input -
```

## Capability workflow

- Locate requirements with `kb_search`/`search --input` and inspect exact details with `kb_query`/`query --input`.
- After meaningful source edits, run `kb_check({sourceFiles:[...], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})` or the equivalent `check --input` JSON recipe before deciding whether traceability is current.
- Apply updates sequentially with `kb_upsert` or `upsert --input` for requirements, scenarios, tests, or facts.
- Validate constraints and consistency with `kb_check` or `check --input`.

## Guidance

- Prefer source-linked relationships so symbols and files can be traced back cleanly.
- Treat `symbol_semantic_review_needed` as a prompt to inspect linked requirements/tests; Kibi reports graph links but does not prove prose semantics.
- Include `kb_query`/`query` and `kb_delete`/`delete` only when explicit cleanups are required.
- Never directly edit `.kb/**`; all modeling and cleanup goes through the selected Kibi interface.
- Preserve the canonical chain `REQ-* -> SCEN-* -> TEST-*` when adding or changing requirements.
- Production symbols should implement requirements; test symbols should remain executable evidence for tests.
