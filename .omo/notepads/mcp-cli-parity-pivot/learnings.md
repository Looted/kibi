## 2026-07-21T07:32:35Z Task: plan-todo-2
- Contract fixtures are best generated from a single seed payload plus live `TOOLS` metadata; that keeps tool names/descriptions/schemas aligned without touching production handlers.
- Normalize only runtime payloads, not tool schemas. I initially stripped keys like `sourceFiles` globally; splitting schema sorting from volatile-field stripping fixed the mismatch.
- Volatile fields observed/stripped in the regenerated snapshots: branch names, kb paths, request IDs, process IDs, timestamps, UUIDs, and other run-specific identifiers.
- The in-memory registration harness only needs `registerTool` capture plus a minimal runtime stub; the per-operation fixtures can stay deterministic and seed-driven.
- Verification succeeded with Bun on the focused contract test plus the two existing coverage tests, and LSP diagnostics were clean after a retry.

## 2026-07-21T09:30:00Z Task: plan-todo-3
- Hash algorithm: SHA-256 via `node:crypto` `createHash('sha256')`.
- Mirror directory structure: each skill is a subdirectory under `packages/{cursor,codex}/skills/` with the same layout as canonical source. Resources are copied recursively.
- `--check` mode regenerates in memory (no writes), diffs against on-disk mirror + hash manifest, exits 0 if identical, 1 with diff summary on drift.
- `--write` mode deletes the entire mirror root and rewrites from scratch (so removed resources don't linger).
- The generator must fail loud (exit 1) if any of the 4 expected canonical skill IDs is missing from `packages/cli/src/public/skills/`.
- Canonical source for the 3 new skills uses `version: 1.0.0` and `kibiCompatibility: "*"` (they have no prior canonical version).
- Existing cursor/codex `kibi-usage` was at v1.0.0 (stale) vs CLI canonical v1.0.1; the generator closes that gap by emitting the canonical source into every mirror.
- Build wiring: cursor/codex `package.json` build scripts invoke the generator after TS compile via `bun run ../../scripts/sync-agent-skills.ts --write --target <name>`.
- Drift tests: `skills-source.test.ts` (CLI) validates canonical source completeness and manifest validity; `skill-drift.test.ts` (cursor/codex) validates byte-for-byte mirror parity and hash manifest integrity.
- The existing `skills-content.test.ts` does not assert skill count, so no modification was needed. The new `skills-source.test.ts` covers the count assertion via `listBundledSkills()`.
- All 53 tests pass across 5 test files; `--check` exits 0; `kibi skills list` returns 4 skills.

## 2026-07-21T09:38:43Z Task: plan-todo-5
- `buildProgram()` is import-safe and registration-only; `main()` owns argv parsing and process termination, while the bin explicitly invokes `main()`.
- JSON mode is integrated into overlapping legacy routes by inspecting Commander's option value source. Defaults do not conflict, but explicitly supplied business flags, positionals, and `--format` do.
- Catalog routes without legacy equivalents are registered from `listSpecs()`; catalog names containing spaces are exposed as dedicated hyphenated routes while legacy nested skill commands remain intact.
- `loadInput()` resolves files against invocation CWD, consumes stdin once, and uses the native JSON parser to reject malformed, empty, array-root, and trailing-content inputs.
- Schema preparation removes top-level `_diagnostic_telemetry`, passes it separately in CLI context metadata, and forces exact top-level properties before invoking catalog placeholders.
- The previously oversized `cli.ts` was split into cohesive registration modules; every new source file remains below the 250 pure-LOC ceiling.
- Focused protocol/registration/conflict/import tests pass (24 tests). A broad mixed legacy suite exceeded the command timeout because Prolog-backed tests are slow; the focused adapter tests remained deterministic and completed in under five seconds.

## 2026-07-21T09:22:24Z Task: plan-todo-6
- Keep catalog `OperationSpec.execute(input, context)` unchanged; the MCP registration layer creates a runtime-bound spec with the same ordering and delegates legacy handlers through the session-owned raw Prolog handle.
- `executeOperation` centralizes the lifecycle invariant: open once, run, invoke `afterSuccess` only when effects include `kb-write`, then close exactly once with a success or error outcome.
- CLI defaults create, attach, and terminate one Prolog process per invocation; injected ports make lifecycle/error tests deterministic without Commander or stdio dependencies.
- MCP adapts the long-lived session Prolog to the minimal public port, retains the raw handle only in a request-context WeakMap, and refreshes the attached branch stamp after successful writes.
- Moving stamp refresh out of `upsert.ts` ensures both upsert and delete receive the same post-write behavior while preserving best-effort refresh semantics.

## 2026-07-21T09:13:58Z Task: plan-todo-4
- The frozen `tools-list.base.json` is sufficient to verify schema extraction: catalog-backed MCP configuration passed the fixture unchanged with all 18 descriptions and schemas.
- Catalog order can follow operation-family ownership while MCP preserves its historical wire order through a typed `MCP_TOOL_ORDER` adapter containing names only; no schema or description remains duplicated in MCP.
- Import purity is easiest to enforce with spies installed before a dynamic `kibi-cli/operations` import; the catalog import produced no stdout/stderr, writes, subprocesses, signal registration, or exits.
- The CLI build already compiles `src/public/operations/**` into `dist/public/operations/`; the post-`tsc` skills copy does not interfere with that output.
- Every family spec stays below 250 nonblank/non-comment LOC; the largest is `mutation.ts` at 214 lines.
- Focused catalog, purity, and frozen MCP contract verification passed (5 tests, 125 assertions). CLI source typecheck passed; the MCP package typecheck was temporarily blocked by concurrent Todo 6 runtime edits outside Task 4 (`mcp-runtime.ts`, `tools-runtime.ts`, and `tools.ts`).

## 2026-07-21T11:09:17Z Task: plan-todo-7
- The executable parity seam uses two independently initialized and seeded temporary Git/KB workspaces per case. CLI calls run through the built binary and MCP calls cross a real SDK `InMemoryTransport` pair before reaching the catalog executor.
- A single normalizer removes only declared volatile keys, workspace-root path prefixes, UUID values, and Prolog PID fragments while preserving business fields and nested diagnostics. A contract assertion proves the stripping behavior before the 18 cases run.
- The case table is catalog-keyed and schema-validated before execution. The MCP anti-drift gate dynamically imports `kibi-cli/operations`, requires 18 specs, and requires exactly one case for each operation name.
- Mutation cases compare post-operation query results and exercise schema-rejected writes, asserting CLI validation exit 2, MCP typed validation errors, and unchanged failed-entity query state.
- Remote SPARQL input is bound to a per-test loopback-only Bun server; no public network endpoint is contacted.
- Focused verification passed 19 tests total: 18 unskipped operation parity cases plus one registry-completeness gate. Each run removed all 36 temporary workspaces through `finally` cleanup.

## 2026-07-21T12:00:00Z Task: plan-todo-8
- Shared executors in `specs/skills.ts` call `listBundledSkills`, `loadBundledSkill`, `readBundledSkillResource` from `kibi-cli/skills`; SHA-256 content hashing moved from MCP handler into the shared `executeSkillsLoad` function.
- The `OperationSpec.execute` signature uses default generic params (`Readonly<Record<string, unknown>>`, `OperationResult<Record<string, unknown>>`) so `as const satisfies OperationSpec` type-checks without per-spec generic instantiation.
- `OperationContext` must be exported from `types.ts` (via `export type { OperationContext }`) for spec files that import from `../types.js`.
- MCP handlers in `tools/skills.ts` became thin adapters: validate/preprocess args, call `getSpec(name).execute(args, minimalContext())`, catch and wrap errors with `Skills * failed:` prefix.
- `resourceListHint` stays in the MCP layer (not the shared executor) because it's an MCP-specific UX enhancement for read errors.
- MCP adapter imports dropped `createHash`, `readBundledSkillResource`, `listBundledSkills` from the old inline implementation.
- 3 new test files created: `cli/tests/operations/skills.test.ts` (8 tests), `mcp/tests/tools/skills-adapter.test.ts` (3 tests), `cli/tests/parity/skills.test.ts` (4 tests). Total 15 new tests + 31 total skill-related tests, all passing.
- The `--input` JSON routes for skills-list, skills-load, skills-read work through `cli-protocol.ts` -> `spec.execute` path, producing identical structured content to the MCP adapter.
- Legacy CLI commands (`skills list`, `skills load`, `skills read`) remain unchanged; they use direct loader calls with Commander-specific rendering.

## 2026-07-21T13:00:00Z Task: plan-todo-11
- The semantic advisor remains fully local: `requiresProlog: false` lets both CLI and MCP runtimes skip Prolog startup while sharing one executor.
- Preserve detector precedence when extracting prose analysis. Predicate rules run before ontology-gap, ambiguity, and strict-property rules, and multi-claim splitting preserves deterministic suggestion ordering.
- A compact declarative predicate-rule engine keeps every shared module below 250 LOC without changing predicate names, arguments, polarity, evidence, apply plans, or ambiguity witnesses.
- `kibi-cli/operations/semantic-advisor/analyze-prose` is the stable upsert-analysis import; the MCP tool adapter imports the public executor from `kibi-cli/operations`.
- Exact-schema CLI validation rejects missing or blank text with exit 2, while successful `semantic-advisor --input` emits one structured JSON value and never starts Prolog.

## 2026-07-21T14:00:00Z Task: plan-todo-8-retry
- Operation specs must import the monorepo-local skill implementation through `../../skills.js`; importing the package export from inside `kibi-cli` can bind execution to stale package output rather than the source module under test.
- Hash assertions should recompute SHA-256 from the returned body, not merely accept any 64-character hexadecimal value.
- Skill parity coverage must invoke `runCliJsonRoute`, `runMCPAdapter`, and `compareResults`; direct calls to all three specs only test operation shape and do not prove transport parity.
- The MCP adapter can import the concrete skill specs, provide the no-Prolog runtime context, and retain MCP-specific error wrapping without owning skill loading or hashing.

## 2026-07-21T14:00:00Z Task: plan-todo-10
- `findGapsSpec`, `coverageSpec`, and `graphSpec` now own Prolog goal construction, defaults, structured payloads, and transport-neutral text summaries; MCP handlers only supply the session Prolog port and retain their historical error prefixes.
- Legacy reporting flags are translated into typed operation inputs before execution. `find-gaps` is the canonical Commander command and `gaps` is its real alias, so both names share one action and produce byte-identical output.
- Reporting JSON routes must open the CLI runtime before entering `cli-protocol`; otherwise a validated `--input` call reaches a Prolog-required shared executor without an attached branch KB.
- Coverage keeps `includePassing: false` and `includeTransitive: true`; graph keeps depth 1 with a hard 1..5 range plus 200-node and 500-edge defaults.

## 2026-07-21T15:00:00Z Task: plan-todo-9-retry
- Query, search, and status now execute from `kibi-cli` operation specs against `OperationContext.prolog`; MCP handlers only adapt their session Prolog process into that context.
- The shared entity-query seam owns Prolog goal construction, parsing, tag filtering, deduplication, and pagination, so tag filtering still occurs before pagination and search ranking remains unchanged.
- Human CLI flags open `createCliRuntime()` and then format the shared structured result; `query --relationships` remains a CLI-only presentation path.
- Prolog-backed `--input` routes must open the CLI runtime before entering `cli-protocol`, matching the reporting extraction pattern and preserving the status freshness query.
- Executable parity tests compare human flag output with JSON protocol output for query, search, and status, while MCP adapter tests compare each handler directly with its shared executor.

## 2026-07-21T16:00:00Z Task: plan-todo-13
- Autopilot cold-start synthesis does not require Prolog: the operation spec is `requiresProlog: false`, while an already-supplied Prolog port still refines attached-KB activation classification and duplicate suppression.
- Repository scans now cross `FilesystemPort.glob/readFile/stat` and `GitPort.ignoredPaths`; shared synthesis never calls `process.cwd()`, `node:fs`, or Git subprocesses directly.
- Discovery embeds source content into deterministic evidence records, allowing candidate builders to remain pure and use string-based markdown/manifest extractors.
- Confidence and candidate bounds remain clamped to 0.60–0.95 and 1–200, and apply plans remain review-only output with no `kb_upsert` or filesystem writes.
- The dedicated CLI JSON/MCP parity case carries nested `bootstrapContext` and deep-compares normalized structured output across both real transports.

## 2026-07-21T17:00:00Z Task: plan-todo-17-retry
- Remote SPARQL execution belongs in the shared operation spec and depends only on `OperationContext.net`; neither CLI nor MCP needs to start Prolog for an HTTP SELECT request.
- `nodeNetwork` is the native Node/Bun `NetworkPort` adapter and is the CLI runtime default, while tests can inject the same narrow port contract directly.
- Timeout compatibility requires rounding positive millisecond input up to whole seconds before creating the abort signal, matching the prior Prolog client behavior.
- CLI JSON, MCP handler, and parity coverage all use a loopback-only `Bun.serve` fixture on `127.0.0.1`; no test needs a public SPARQL endpoint.

## 2026-07-22T00:00:00Z Task: plan-todo-18
- Capability guidance follows one explicit state machine across all four canonical skills: positively visible and approved MCP first, trusted project-local CLI through `npx --no-install` or `bunx --no-install` second, then stop with operator action when neither capability is usable.
- The operation-access resource is a parseable 18-row Markdown table checked directly against `listSpecs()`, including normalized dedicated CLI routes, JSON/flag input modes, mutability, Prolog requirements, effects, and the MCP-first/CLI-fallback preference.
- Pipes inside Markdown table cells break simple machine parsing; representing input mode as `--input JSON` or `--input JSON or flags` keeps the resource deterministic while the prose defines `<file|->` semantics.
- Cursor and Codex mirrors remain generated artifacts: updating canonical sources and running `sync-agent-skills.ts --write` copies the new resource and refreshes both hash manifests.
- Test symbols must use `executable_for` without mixing production `implements` ownership; the requirement remains connected through the existing test entity.

## 2026-07-22T12:00:00Z Task: plan-todo-19
- Cursor worktree resolution needs two roots: `workspaceRoot` remains the Kibi data target through `KIBI_WORKSPACE`, while `runtimeRoot` is the validated checkout used as process CWD for built MCP imports.
- The only trusted fallback checkout is derived from the current worktree's absolute `git-common-dir`; using the resolver script's own checkout would allow unrelated builds to leak across repositories.
- Candidate validation is side-effect free: require MCP bin/dist, Bun or Node, SWI-Prolog, and matching core/CLI/MCP package versions before launch. Rejections are emitted in local-then-primary order and never invoke installers, network tools, globals, or `.opencode/bin`.
- Cursor has no supported hook trust signal, so root dogfood uses an explicit checked-in `--trusted-workspace` opt-in. Hooks keep MCP state strictly `observed`/`unknown`, emit non-installing CLI commands only for trusted unknown state, and never execute those commands.
- Seven temporary-repository tests cover local and primary selection, unrelated checkout rejection, version drift, missing/incomplete builds, and paths containing spaces without skips or network access.

## 2026-07-22T14:00:00Z Task: plan-todo-20
- Active repository, Copilot, Cursor, OpenCode, and MCP bootstrap guidance now uses one three-state interface policy: visible MCP tools, trusted project-local CLI JSON routes with `--input`, or a blocked state that tells the operator what capability is missing.
- Capability selection must never infer MCP availability from config-file presence; the Cursor host resolver remains the only runtime state seam, while static guidance explains the same policy without probing or installing anything.
- The interface pivot preserves the invariant safety sequence everywhere it appears: never access `.kb/` directly, discover/query before mutation, execute upserts sequentially, and run `kb_check` before completion.
- OpenCode's bootstrap posture text is capped by a prompt word budget, so the capability and safety state machine must appear before lower-priority bootstrap details or it can be truncated from the injected system prompt.
- Focused tests first failed against every obsolete surface, then passed across OpenCode policy/prompt/hooks, Cursor read/write guidance, and MCP runtime docs after the production wording pivot.

## 2026-07-22T16:00:00Z Task: plan-todo-21
- Active guidance now treats MCP tools and the CLI's 18 dedicated `--input <file|->` routes as peers; `find-gaps` is canonical and `gaps` remains its exact alias.
- The JSON protocol contract is stable and documentable across routes: one object from a file or stdin, structured JSON on stdout, exit `0` for success, `1` for execution failure, and `2` for invocation/schema failure.
- Briefing governance required no new mutation: every discovered briefing requirement was already `superseded`, and every discovered briefing scenario/test was already `closed`; historical artifacts and negative regression mentions remain untouched.
- Symbol traceability needs explicit manual anchors for non-TypeScript runtime seams such as the Cursor worktree resolver, while generated coordinates can cover TypeScript protocol and skill-generator symbols.

## 2026-07-22T18:00:00Z Task: plan-todo-22
- Packed dependency-floor tests need root manifest overrides that point `kibi-cli` and `kibi-core` transitives at local tarballs; otherwise npm tries to satisfy the future `^0.15.0` CLI floor from the registry before versioning occurs.
- The packed harness executes all 18 dedicated routes twice, once from a JSON file and once from stdin, against one isolated Git/KB sandbox and a loopback-only SPARQL server.
- Live MCP `tools/list` schemas are SDK-rendered Zod JSON Schema, so parity comparison canonicalizes SDK-only metadata, enum encodings, defaults, and unconstrained object markers before comparing the frozen transport-neutral fixture.
- Shared Prolog module executors must load `use_module/1` in a separate query before invoking reporting predicates; combining module loading and execution reproduces the packed `Predicate or file not found` failure.
- Cursor and Codex tarball listings provide the final distribution gate for all four generated skills, all four `kibi-usage` resources, and `operation-access.md`.

## 2026-07-22T20:00:00Z Task: final-verification-rejections
- The modeling specs were still wired to `executePlaceholder`; moving both implementations under `kibi-cli/src/operations/modeling` made the catalog the real behavior owner and reduced MCP handlers to context adapters.
- `model-requirement` needs a transport-neutral default source for text-only JSON input. Supplying `mcp://kibi/model-requirement` at executor entry preserves strict helper validation while making the documented CLI route useful.
- The prior module-loading conclusion above was invalid for the shared runtime: separate interactive `use_module/1` calls caused the observed status/reporting failures. One compound `(use_module(...), module:predicate(...))` query passes mocked query-shape tests and isolated real-Prolog regressions.
- Shared error composition must avoid stacking legacy helper prefixes beneath operation-level prefixes; `runAggregatedChecks` now emits the contract error and `executeCheck` owns the public wrapper.
- Empty rule arrays and arrays containing only unknown rules are both explicit no-op check selections; neither should fall through to the default rule set or full quality queries.
- Nested Commander skill routes need their own `--input` options and optional positionals so catalog names such as `skills list` remain executable exactly as declared.
- Package parity must compare against the checked-in CLI version, not a future release floor; `kibi-mcp` now accepts `kibi-cli@^0.14.2`.
- Mutation schema data, upsert wiring, and validate/delete wiring are distinct responsibilities; splitting them keeps every operation spec file below 250 lines without changing imports used by existing adapters and tests.
