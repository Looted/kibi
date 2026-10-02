# Agent Guidelines for Kibi

Repo-specific rules for agents working on Kibi. Tool schemas, workflows and modeling detail live elsewhere (see Quick References); this file only states policy.

## Product Mission

Kibi is an **agent-native requirements compiler and enforcement layer**, not a human-maintained requirements database or passive retrieval memory.

- Humans state intent and resolve genuine ambiguity; agents translate it into branch-local requirements, scenarios, tests, semantic facts and code-symbol links.
- Symbols need requirement ownership, requirements need clause-complete semantics and scenarios, scenarios need tests, and proof-bearing tests need fresh end-to-end evidence for the current code snapshot.
- LLMs interpret and author; typed representations and Prolog check schema, coherence, contradictions, traceability and proof deterministically.
- Prolog proves only what has been encoded. Ambiguity, ontology gaps, incomplete grounding and stale evidence stay explicit; they are never treated as proof.

Public shorthand: **Prompt the intent. Kibi makes the agent remember it—and prove the implementation.**

## Source of Truth

1. MCP `inputSchema` and CLI JSON contracts define the executable contract.
2. Bundled Kibi skills (start with `kibi-usage`) define agent workflows.
3. Reference docs (`docs/mcp-reference.md`, `docs/entity-schema.md`) explain them to humans.
4. This file holds repo-specific policy. If it disagrees with a schema, follow the schema and fix this file.

Skill text is guidance, never permission to bypass schemas, approvals or mutation safeguards.

## Using Kibi

- Select the interface by capability: visible MCP `kb_*` tools first; otherwise the trusted project-local CLI JSON routes (`printf '%s\n' '{...}' | npx --no-install kibi <route> --input -`); if neither is available, stop and tell the operator. Never infer MCP availability from config files.
- Load workflow guidance with `kb_skills_list` / `kb_skills_load` (CLI: `kibi skills-list`, `kibi skills-load`).
- Do **not** read or edit `.kb/` files directly. Go through Kibi operations.
- CLI-only operations (sync, refresh) may be run when needed for validation or freshness.
- Infrastructure setup or repair beyond `kibi init` / `/kibi-bootstrap` is for the operator.

### Workflow

- **Discover:** `kb_search` first, then `kb_query` for exact `id`/`type`/`sourceFile`/`tags`. Use `kb_status` when freshness matters; `kb_find_gaps`, `kb_coverage`, `kb_graph` for analysis.
- **Mutate:** query before mutate, create endpoints before linking, run `kb_upsert` sequentially in small batches, use `kb_delete` only for intentional removals.
- **Validate:** targeted `kb_check` while iterating, a final `kb_check` before completion. Do not hand off until `kibi status` reports a clean, fresh KB; resolve the cause rather than noting it as a caveat.

Graph coverage is useful for discovery but is **not semantic proof**.

## Modeling Rules

- Canonical entity types: `req`, `scenario`, `test`, `adr`, `flag`, `event`, `symbol`, `fact`.
- Traceability chain: `REQ-* -> SCEN-* -> TEST-*`. Prefer typed relationships (`specified_by`, `verified_by`, `validates`, `implements`, `covered_by`, `executable_for`); plain `links` import only as `relates_to`.
- `restates` (req -> req) when two current requirements intentionally ground the same term; `supersedes` when one replaces the other. Requirement semantics evolve append-only via `supersedes`.

### Naming (no numbering)

- `<TYPE>-<area>-<behavior>` in kebab-case (`REQ-cli-gc`, `SCEN-mcp-search-discovery`, `ADR-capability-plugins-v1`). The filename stem equals the `id`.
- Never pick "the next number"; parallel branches collide. `kb_search` the area first and update or supersede an existing entity instead of duplicating it (`-v2` only for a direct superseding replacement). A collision with another branch usually means duplicated work: reconcile, don't rename.
- `subject_key` is dotted `component.aspect[.sub]` in lowercase snake segments, never derived from a requirement ID.
- Legacy numbered entities (`REQ-001`…) are grandfathered and must not be renamed.

### Choosing flag vs fact

- `flag` = runtime/config gate.
- `fact` with `fact_kind: observation` or `meta` = bug, workaround and incident notes (non-blocking lane).
- Never create a `flag` for a bug or workaround without an actual gate. When both exist, use the paired model: `flag` for the gate, `fact` for the issue evidence.

### Semantic facts

- Contradiction-checked requirements link to a `fact_kind: subject` via `constrains` and a `fact_kind: property_value` via `requires_property`. Typed fact fields are snake_case only.
- For domain claims, call `kb_suggest_predicates` before writing prose and prefer the returned `fact_kind: predicate` plan linked via `requires_predicate`. Reuse `predicate_schema` `argument_constants` instead of minting atoms. If no predicate fits, use an `observation` tagged `review:ontology-gap`.
- Field examples and recovery guidance: `docs/modeling-cheatsheet.md`, `docs/error-reference.md`.

## Symbol Traceability

- New or modified symbols must trace to at least one requirement. For test/e2e code prefer the symbol manifest + `executable_for`; inline `// implements REQ-<area>-<behavior>` is acceptable for quick changes.
- When code edits change symbol extraction output, commit the updated `.kb/symbol-coordinates.yaml` (and `.kb/symbols.yaml` for new logical symbols) with the code.

## README and Landing Page

Any meaningful change must update `README.md` and the docs-site landing page (`landingContent` in `docs-site/theme.ts`, plus the `docs-site/content/` pages it links to) in the same PR.

- Meaningful means anything a user or evaluator would notice: a new, changed or removed feature, command, MCP tool, option, default, install step, supported platform or agent host, or a change to what Kibi claims to do.
- Internal refactors, tests, CI and tooling changes don't need it. Say "README/landing: no impact" in the PR description when you skip it, so reviewers see the call was made.
- Keep both accurate rather than promotional: no claims the code doesn't back.

## Releases (npm packages)

Applies to publishable packages (`kibi-core`, `kibi-cli`, `kibi-mcp`, `kibi-opencode`, `kibi-codex`, `kibi-cursor`, and the other `packages/*` published to npm).

- Add a changeset in the same work. It opens with 2-4 sentences of user impact, then the technical summary.
- Use Conventional Commits. Never `npm publish` manually.
- `bun run version-packages` runs on `develop`; never merge `master` back into `develop`.
- After version or wiring changes used for dogfooding, run `bun run build` (and `bun run sync:cursor-dogfood` for Cursor).

## Quality Bar

- **Pre-existing issues are yours.** Never hand off past broken tests, validation failures, stale KB state or diagnostics, even if they predate your change, unless the user explicitly narrows scope.
- **Tests:** assert observable behavior, not lines. Don't add coverage-only files or refactor production code just to cover it; consolidate existing `*.coverage.test.ts` files when you touch their code. Restore mocks, isolate filesystem effects and reset global state; verify both isolated and full-suite runs.
- **Proof:** run `bun run proof:prepush` on the clean, committed branch after refreshing Kibi. For changes to proof contracts, coverage links or proof tooling, also run `bun run proof:replay`. Passing tests alone do not establish the proof baseline.
- **Self-review:** before committing or opening a PR, review the diff with `ocr delegate preview` (or the `open-code-review-delegate` skill) and fix or report every finding.
- **Clean tree:** delete session artifacts (`.playwright-mcp/`, ad hoc logs, scratch files) and review `git status` before staging; avoid `git add -A`.

## Quick References

`docs/mcp-reference.md` · `docs/entity-schema.md` · `docs/modeling-cheatsheet.md` · `docs/error-reference.md` · `docs/inference-rules.md` · `docs/cli-reference.md` · `docs/generic-agent-onboarding.md` · `docs/mutation-testing.md` · `CONTRIBUTING.md`
