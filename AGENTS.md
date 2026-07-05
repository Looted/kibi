# Agent Guidelines for Kibi Project

This file is intentionally terse. It captures repo-specific operating rules for agents and avoids duplicating MCP tool schemas or long-form docs.

## Source of Truth Hierarchy

1. MCP tool `inputSchema` enums/required fields (authoritative for tool contracts)
2. `docs/mcp-reference.md` and `docs/entity-schema.md`
3. This file (workflow and policy guardrails)

If this file and MCP schema details diverge, follow MCP schema and update this file.

## Non-Negotiables

- Use MCP tools for Kibi operations that have MCP equivalents.
- Do **not** manually read or edit `.kb/` files.
- CLI-only Kibi operations, including sync/refresh workflows that do not have MCP tool equivalents, may be run from agent sessions when needed to complete validation or freshness work.
- If KB setup/repair is needed beyond `/init-kibi`, ask the user/operator to run those steps.
- **Pre-existing issues must always be fixed before handoff.** Never ship past broken tests, validation failures, stale KB state, diagnostics, or other known defects. If an issue existed before your changes, diagnose and fix it as part of your work unless the user explicitly narrows scope and accepts the risk. Skipping or bypassing pre-existing issues is not acceptable.

## Required Kibi Workflow (Current Standard)

1. **Bootstrap day-0 with `/init-kibi`**
   - Ask at most 4 bounded context questions.
   - Use `kb_autopilot_generate` for read-only synthesis.
   - Show preview and get explicit approval before writes.
   - Apply approved writes via sequential `kb_upsert`.
   - Run `kb_check` after applying.


2. **Discovery before exact lookup**
   - Start with `kb_search`.
   - Follow with `kb_query` for exact entities/filters (`id`, `type`, `sourceFile`, `tags`).
   - Use `kb_status` when branch/snapshot freshness confidence matters.
   - Use `kb_find_gaps`, `kb_coverage`, `kb_graph` for curated analysis.

3. **Mutation discipline**
   - Query before mutate.
   - Create relationship endpoints before linking.
   - Run `kb_upsert` sequentially (never parallel).
   - Use small, reviewable batches.
   - Use `kb_delete` only for intentional removals with dependency awareness.

4. **Validation discipline**
   - Run targeted `kb_check` rules during iteration.
   - Run a final `kb_check` before completion.
   - Resolve KB freshness before completing tasks: updated, no-impact with rationale, or deferred/failed. If freshness requires a Kibi operation that has no MCP equivalent, run the CLI workflow needed to refresh or sync the KB.
   - Do not hand off work unless `kibi status` reports a clean, fresh KB state. If status is not clean/fresh, resolve the cause before completion rather than documenting it as a caveat.

## Knowledge Quality Metrics

Agents should monitor usage and quality signals, not just raw graph size:

- **Source-file hit rate**: how often source-linked lookups (`sourceFile`, `--source`) return relevant linked entities.
- **Symbol coverage**: how many new or modified symbols remain traceable to at least one requirement.
- **Telemetry completeness**: how often usage events include the telemetry needed for later audit and diagnosis.
- **Zero-result rate**: how often search/query/reporting flows return no useful entities, especially for source-linked lookups.
- **Validation recovery**: whether `kb_check` violations trend down after fixes instead of repeatedly reappearing.
- **Semantic sample audit**: periodic spot checks that retrieved entities and facts actually answer the operator question.

Graph coverage is useful for discovery, but it is **not semantic proof**. High link counts or broad traversal reach do not by themselves prove requirement correctness, contradiction safety, or operator usefulness.

## Modeling Rules (Current Standard)

- Canonical entity types (all eight): `req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, `fact`.
- Canonical traceability chain: `REQ-* -> SCEN-* -> TEST-*`.
- Prefer typed relationships (`specified_by`, `verified_by`, `validates`, `implements`, `covered_by`, `executable_for`, etc.).
- Plain string `links` import as generic `relates_to` only.

### Canonical entity-choice rule

- `flag` = runtime/config gate.
- `fact` = issue evidence lane (bug, workaround, incident notes), especially `fact_kind: observation` and `fact_kind: meta`.
- Do not use `flag` for bug/workaround records without an actual gate.
- When both a gate and issue note exist, use a paired model: `flag` for the gate + `fact` for the bug/workaround evidence.

### Strict fact lane (contradiction-safe requirements)

For normative requirements that should participate in contradiction checks:
- Link requirement -> `fact_kind: subject` via `constrains`
- Link requirement -> `fact_kind: property_value` via `requires_property`
- Use `docs/modeling-cheatsheet.md` and `docs/error-reference.md` for agent-facing field examples and recovery guidance. `kb_upsert.properties` typed fact fields are snake_case only; do not use camelCase aliases such as `subjectKey`.

### Predicate ontology lane (alpha)

For project-local domain ontology claims:
- Before writing ontology prose, spell out the requirement claim and call `kb_suggest_predicates` to get ranked predicate candidates.
- Prefer applying the returned `fact_kind: predicate` plan and `requires_predicate` relationship when a candidate fits.
- Use `fact_kind: predicate_schema` to define allowed predicate signatures.
- Use `fact_kind: predicate` to encode ground predicate claims with `predicate_name`, `predicate_args`, `canonical_key`, and optional `polarity: assert|deny`.
- Link requirement -> `fact_kind: predicate` via `requires_predicate`.
- Do not replace predicate facts with prose when a suitable predicate schema exists; use `observation` with `review:ontology-gap` when no predicate fits.

For bugs/workarounds/governance notes:
- Use `fact` with `fact_kind: observation` or `meta` (non-blocking lane)
- For each bug/workaround note, prefer `observation` or `meta` fact kinds
- Do **not** model bug records as `flag` unless there is an actual runtime/config gate

Requirement semantic evolution is append-only:
- Create a new requirement and link old -> new with `supersedes` semantics as appropriate.

## Symbol Traceability Standard

- New/modified symbols must be traceable to at least one requirement.
- Preferred for test/e2e code: symbol manifest + `executable_for` relation.
- Inline `// implements REQ-xxx` remains optional/backward-compatible for quick code-only changes.
- When code edits change symbol extraction output, include updated `documentation/symbol-coordinates.yaml` in the same commit as the related code/documentation changes. If new logical symbols are added, update `documentation/symbols.yaml` accordingly.

## Release & Versioning Rules (npm packages)

Applies when changing publishable packages (`kibi-core`, `kibi-cli`, `kibi-mcp`, `kibi-opencode`, `kibi-codex`, `kibi-cursor`).

- Add a changeset as part of the same work.
- Use Conventional Commits.
- Do not publish manually (`npm publish` forbidden).
- Run `bun run version-packages` on `develop` (or pre-merge flow targeting develop).
- Do not merge `master` back into `develop`.
- After version/wiring changes used by local dogfooding, run `bun run build`. For Cursor dogfood in this repo, also run `bun run sync:cursor-dogfood`.

### Changeset writing rule: human-readable first

Every changeset must start with a short human-facing summary before technical bullets:

1. **User impact prose first** (2-4 sentences): what changed from a human user's perspective, why it matters, and what behavior/outcome is different.
2. **Dry technical summary second**: concise commit-style/package-level details.

Do not start a changeset with internal-only jargon or dry commit bullets.

## Test Hygiene (Environmental Pollution)

Before declaring tests passing:

- Restore mocks in `afterEach`.
- Isolate filesystem side effects and clean up temp artifacts.
- Reset mutable module/global state between tests.
- Verify both isolated test runs and full-suite runs.

## Quick References

- `docs/mcp-reference.md`
- `docs/entity-schema.md`
- `docs/inference-rules.md`
- `docs/prompts/llm-rules.md`
- `docs/cli-reference.md`
