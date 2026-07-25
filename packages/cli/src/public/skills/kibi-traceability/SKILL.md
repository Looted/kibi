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

Validate and strengthen requirement, scenario, test, and source-file traceability before and after code changes.

## Interface Selection

1. If Kibi MCP tools are positively visible and approved, use the MCP surface.
2. Otherwise, in a trusted workspace, use the canonical project-local CLI fallback through `npx --no-install kibi ...` or `bunx --no-install kibi ...`.
3. If neither approved MCP tools nor the project-local CLI are available, or if the CLI is unavailable or too old, stop and tell the operator to enable or install Kibi.
4. Never use a global fallback or an installing runner.

Use MCP routes as the primary authority for modeling, querying, checking, and cleanup. Use the project-local CLI only as the fallback interface, with JSON input passed through stdin. For example:

```bash
echo '{"sourceFiles":["src/auth/login.ts"],"includeImpactDiagnostics":true,"includeWorkingTreeDiff":true}' | npx --no-install kibi check --input -
```

## Capability Workflow

- Locate requirements through `kb_search` or `search --input`, then inspect exact records through `kb_query` or `query --input`.
- Before meaningful edits, identify linked requirements, scenarios, tests, facts, source files, and behavioral symbols relevant to the planned change.
- After meaningful source edits, run `kb_check({sourceFiles:[...], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})` or the equivalent `check --input` JSON recipe before deciding whether traceability is current.
- Apply traceability updates sequentially through `kb_upsert` or `upsert --input` for requirements, scenarios, tests, facts, and source-linked relationships.
- Validate constraints and consistency through `kb_check` or `check --input` after updates.
- Use `kb_delete` or `delete --input` only for explicit cleanup of obsolete records or relationships.

## Guidance

- Prefer source-linked relationships so requirements, scenarios, tests, symbols, and files can be traced cleanly.
- Preserve source-file traceability whenever adding or changing requirements, scenarios, tests, facts, or implementation links.
- Preserve the canonical chain `REQ-* -> SCEN-* -> TEST-*` when adding or changing requirements.
- Production symbols should implement requirements; test symbols should remain executable evidence for tests.
- Resolve impact at behavioral-symbol granularity when Kibi reports symbol-level diagnostics; avoid treating a whole file as impacted when the report identifies narrower linked behavior.
- Treat `symbol_semantic_review_needed` as a prompt to inspect linked requirements and tests; Kibi reports graph links but does not prove prose semantics.
- Do not read or edit files inside `.kb` directly; all modeling and cleanup goes through the selected Kibi interface.
- Keep approval boundaries intact: only use Kibi MCP tools that are visible and approved, and only use the project-local CLI fallback in a trusted workspace.