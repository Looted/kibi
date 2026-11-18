# Interfaces and workspaces

## Interface selection

Use whichever capability is visible and approved. The surfaces are equal peers:

1. If approved Kibi MCP tools are visible, use them.
2. Otherwise use `npx --no-install kibi ...` from the trusted project-local CLI.
3. If the operator capability is unavailable or too old for the needed route,
   stop and identify the missing capability.
4. Never use a global fallback, an installing runner, or an unapproved route.

Hosts may expose prefixed identifiers such as `kibi_kb_search`,
`kibi_kb_query`, and `kibi_kb_upsert`; map them to the canonical MCP names.

The MCP server keeps its tool list short. Load skills with `kb_skills`
(`action: "list" | "load" | "read"`; CLI `kibi skill` or `kibi skills
list|load|read`). Model prose with `kb_model` (`mode: "analyze"` for the
semantic advisor, `"requirement"` for strict claims, `"predicates"` for
ontology predicates; CLI `kibi model` takes the same input, `mode` and
`requirementId` included; the single-mode routes `semantic-advisor`,
`model-requirement`, `suggest-predicates` take only their mode's fields). Preflight a write with
`kb_upsert` plus `dryRun: true` (CLI `upsert` with `"dryRun": true` or
`validate-upsert`); it validates and writes nothing. Result payloads still name
catalog operations such as `kb_model_requirement` or `kb_validate_upsert` in
`recommended_tools` and repair steps; translate them with the list in
`resources/operation-access.md`.

The MCP server lists every Kibi tool unless the project chooses the core
profile, which lists `kb_search`, `kb_query`, `kb_record`, `kb_upsert`,
`kb_check`, `kb_status`, `kb_skills` and `kb_review_firm_edit`. Under core,
`kb_model`, `kb_compile_intent`, `kb_delete`, `kb_prepare_impact_review` and
the other tools run through the CLI with the same input (`kibi model --input -`,
`kibi compile-intent --input -`, `kibi delete --input -`,
`kibi prepare-impact-review --input -`); the server's initialize instructions
name them. The core profile is chosen with `KIBI_MCP_TOOLS=core`,
`kibi-mcp --tools core`, `"kibi": { "mcpTools": "core" }` in package.json or
`"mcpTools": "core"` in `.kb/setup.json`.

The CLI JSON route accepts the same business object as MCP:

```bash
printf '%s\n' '{"query":"checkout","limit":10}' | npx --no-install kibi search --input -
```

Read `resources/operation-access.md` for the route, result version, effects,
mutability, and Prolog requirements of each operation.
The MCP tool list gives long field rules in one short line. Read
`resources/operation-fields.md` for a field's full rule before relying on a
detail the short line leaves out.

## Working in a git worktree or another directory

Kibi MCP servers start in one project and answer from its knowledge base.
Every Kibi MCP tool accepts `workspaceRoot`: when your working directory is not
the project the server started in (a git worktree, a sibling checkout), pass
your working directory as `workspaceRoot` on every call. Host plugins with
pre-tool hooks add it for you. The server answers from that workspace when it
is a worktree of the same repository or lies under the client's MCP roots.

If a result carries a `workspace_mismatch` diagnostic, the answer came from a
different workspace than the one you asked for; its `detail.reason` says why.
Use the CLI from your working directory instead: `npx --no-install kibi ...`
runs where you are and needs no `workspaceRoot`.

## Reading another repository's knowledge base

When the project declares KB dependencies (`kibi deps status` lists them),
the tools `kb_search`, `kb_query`, `kb_status`, `kb_find_gaps`, `kb_coverage`
and `kb_graph` take `kb: "<name>"` to answer from that repository's KB at its
pinned commit (CLI: `--kb <name>`). Reach for it when a question is about a
library or service this project calls rather than about this project's own
code. A dependency KB is read-only: never pass `kb` to a
write, and do not copy its requirements into this project's KB. A
`DEPENDENCY_NOT_LOCKED` or `DEPENDENCY_LOCK_STALE` error means the pin needs
`kibi deps lock`, which changes committed files, so ask before running it.
