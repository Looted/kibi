# kibi-mcp

## 0.21.1

### Patch Changes

- Upserts now finish as one bounded commit, so an entity, its relationships, audit history, and branch snapshot succeed or fail together. Historical audit journals no longer remain locked after a write, and stale runtimes receive a clear restart instruction instead of hanging indefinitely. Timed-out Prolog work is terminated and reaped, including the process group, so later Kibi operations can continue safely.

  - Add `kb_commit_upsert/5` with branch-lock, snapshot, audit-lock, stage-marker, and single-save handling.
  - Attach persistent audit stores with `sync(close)` and use non-blocking stale-lock probes.
  - Route CLI upserts through the combined commit goal and manage Bun one-shot children asynchronously with TERM/KILL escalation.

- Updated dependencies
  - kibi-core@0.9.1
  - kibi-cli@0.18.1

## 0.21.0

### Minor Changes

- Coverage reports now distinguish structural linkage from a conservative end-to-end requirement proof. Users can see exactly which semantic, contradiction, scenario, E2E, symbol, or source-coordinate stage prevents proof, together with ranked repair guidance; executable test symbols also stop inflating production-coverage counts. Structured proposition ledgers and refreshed symbol coordinates now survive sync as queryable proof evidence.

  Current requirement ingestion now fails closed when assertive prose is missing from its ledger, drifts from its source hash or byte spans, duplicates an identity, or claims a modeled representation without exactly one same-key grounding fact. Markdown projects receive a compatibility baseline before new or semantically edited requirements are held to the contract, and explicit unresolved states remain usable without being misreported as consistency.

  Proof-bearing tests now keep append-only execution receipts tied to the current deterministic workspace snapshot. Coverage and status expose that snapshot through CLI and MCP, and missing, stale, failed, malformed, mismatched, future-dated, or unavailable evidence can no longer inherit authority from a durable `passing` label.

  Requirement coverage now turns proof gaps into a deterministic read-only migration plan. Users can work one validated dependency batch at a time, see when pagination makes a plan incomplete, and avoid applying downstream links or receipts before their semantic and graph prerequisites exist.

  Diagnostic usage evidence now drives a versioned workflow acceptance report. Users can enforce fresh advisor, validation, source-lookup, proof-recovery, receipt, and mutation-retry evidence from the CLI, while unfiltered CLI/MCP checks surface ranked project-local repairs without treating missing or stale telemetry as a pass.

  Distribution audits now compare the same six requirement-compiler behaviors across source, freshly packed CLI/MCP packages, and the binaries actually resolved by dogfood or pinned projects. Unsupported legacy capabilities remain explicit non-matches, executable provenance is inspected directly, and every project divergence needs a named upgrade or compatibility action.

  Diagnostic workflows now produce correlated evidence through both CLI JSON and MCP surfaces. Operators can run a read-only versioned remediation report that points to exact unmatched log events, preserves explicit missing-coverage work, and prevents advisor or preflight evidence from a different identified session or actor from counting as proof.

  Legacy prose can now be inspected one requirement at a time through a deterministic migration preview. The preview preserves existing code evidence, binds every extracted proposition to exact authored source, ranks project-local ontology candidates, and never emits an auto-applicable write.

  - Add the shared `kibi.requirement-proof.v2` Prolog evaluator and expose its rows, fresh receipt evidence, and summary counts through CLI and MCP coverage.
  - Persist generated symbol coordinates and symbol metadata into normal and staged RDF projections.
  - Preserve semantic-inventory JSON through mutation, sync, RDF storage, and query round trips, and refresh coordinates before extracting their manifest overlay.
  - Render proof state and proof gaps in the CLI coverage table, and classify symbol traceability roles explicitly.
  - Document the proof contract and update the bundled traceability skill to use proof outcomes instead of structural counts as its success boundary.
  - Add the versioned `kibi.semantic-inventory.v1` boundary to CLI/MCP preflight, upsert, modeling plans, and Markdown sync, with packed-package E2E coverage.
  - Preserve JSON Schema `const` values through MCP's Zod adapter so source and packed tool contracts enforce and advertise the same inventory version.
  - Add append-only `kibi.verification-receipt.v1` validation, RDF/Markdown persistence, snapshot-bound freshness checks, explicit repair gaps, and CLI/MCP workspace-snapshot parity.
  - Discover project-local predicate schemas from normalized RDF, withhold write plans for unbound ordered arguments, and accept exact `schemaId`, `argumentBindings`, and reviewed `polarityHint` inputs for conservative completion without lexical guessing.
  - Attach source-bound strict, predicate, and rule witnesses to contradiction diagnostics, preserving unresolved rule overlap as incomplete analysis in requirement proof.
  - Add `kibi.repair-plan.v1` to requirement coverage with stable plan IDs, per-requirement dependency batches, pagination fail-closed behavior, validation workflows, and non-auto-applicable sequential mutation policy across CLI and MCP.
  - Add `kibi.telemetry-acceptance.v1`, exact mutation fingerprints, coverage recovery/receipt event fields, the `usage-metrics --require-acceptance` gate, and telemetry-backed full-check quality diagnostics.
  - Add `kibi.distribution-parity.v1`, executable-derived runtime provenance, stable semantic normalization, action-bound project divergences, and packed/project-resolved E2E fixtures for the six requirement-compiler capabilities.
  - Add CLI JSON diagnostic logging, opaque session/actor correlation, and the deterministic read-only `kibi.telemetry-remediation.v1` report and command.
  - Add `kibi.legacy-migration-plan.v1` to CLI and MCP coverage with fail-closed source binding, exact proposition inventories, schema-provenance ranking, deterministic pagination, and packed read-only E2E coverage. Requirement-only `semantic_text` now carries authored prose independently from `text_ref` evidence, and semantic source drift blocks review application.

### Patch Changes

- Updated dependencies
  - kibi-core@0.9.0
  - kibi-cli@0.18.0

## 0.20.1

### Patch Changes

- Kibi MCP now stays on the server version that was explicitly launched when it is used from a workspace without its own package manifest. This prevents an ambient cached installation from replacing the local server and silently dropping fresh status and logic behavior.

  - Require a discovered workspace `package.json` before resolving a project-local MCP package.
  - Add regression coverage for non-package workspaces and preserve genuine stale-package detection for package-managed workspaces.

## 0.20.0

### Minor Changes

- a52b592: Kibi can now turn a requirement’s assertive prose into reviewable, typed logical models while keeping the original wording for people. Conditional rules, obligations, permissions, prohibitions, exceptions, bounded quantities, and temporal qualifiers are validated before they enter the knowledge base, and contradictions can report structured witnesses instead of relying on executable text. Existing requirements remain compatible and can be migrated or backfilled deliberately.

  - Add versioned `kibi.logic.v1` IR, safe bounded Prolog interpretation, rule schemas, rule facts, provenance, and contradiction checks.
  - Extend the semantic advisor with proposition inventories, typed alternatives, source spans, shadow audits, and logic apply plans.
  - Preserve rule fields and `requires_rule` through CLI, MCP, Markdown, Prolog, and schema validation surfaces.
  - Add rule safety, rule verifiability, and semantic completeness checks plus schema-v4 migration metadata.

### Patch Changes

- 87b5830: Non-interactive MCP clients can now inspect Kibi branch status without an unnecessary approval prompt. The status operation is explicitly advertised as read-only, non-destructive, idempotent, and closed-world, matching its existing behavior.

  - Add MCP tool annotations for `kb_status`.
  - Extend registration and frozen tool-contract coverage.

- 5e4e126: Agents no longer treat Kibi's CLI as an MCP fallback. MCP tools and the trusted project-local CLI are presented as peer surfaces over the same 18 operations, and agent guidance now selects whichever interface is visible and approved in the current environment. The CLI's `--input` JSON routes remain first-class for agent automation, with no preference order implied.

  - Reframe `kibi-usage` Interface Selection and the operation-access preference column to peer surfaces.
  - Update OpenCode prompt injection, enforcement, and init-kibi guidance.
  - Update the MCP init-kibi prompt and the staged-impact evidence resolution text.
  - Re-sync the Cursor and Codex skill bundles.

- 69a278a: The MCP server now reliably reports fresh status after a write in the same session. A same-version project-local kibi-mcp copy no longer causes the launcher to abandon the running local build for a published store copy, so local dogfooding and unreleased fixes are honored. `kb_status` also invalidates the Prolog query cache before evaluating, so it always reflects the current workspace state rather than a stale earlier-in-session result.

  - Only re-enter the project-local kibi-mcp on a genuine version mismatch; matching versions keep the running build.
  - Invalidate the PrologProcess query cache before `kb_status` so freshness is read-after-write consistent.
  - Stabilize the same-session status test with polling and update resolution/mock tests.

- 2a85fc8: Kibi can now track whether every atomic clause in a normative requirement has a queryable logical representation. Readable prose remains intact, while stable claim keys, linked strict-property or predicate facts, and a requirement manifest expose incomplete modeling before it silently weakens contradiction detection. Exact opposite polarities over the same ground predicate now produce a contradiction.

  - Remove repository-specific release and optimizer-corpus text from `kibi-usage`.
  - Add portable clause-complete prose-to-ground-predicate/property guidance and examples.
  - Preserve logical claim and predicate-schema fields through Markdown sync.
  - Add semantic-advisor clause inventories, merged claim manifests, and the `logic-coverage` check.
  - Enable manifest validation by default and report every current unmanifested requirement as explicit backfill debt.
  - Detect exact `assert`/`deny` conflicts over the same ground predicate.
  - Normalize trailing clause punctuation so formatting variants share one claim identity.
  - Enforce a one-claim/one-ground-fact mapping and reject duplicate logical terms masquerading as separate coverage.
  - Preserve every target when exact query results contain repeated relationship types.
  - Keep semantic-advisor readiness partial until every normative claim has a distinct logical grounding slot.
  - Drain machine-readable CLI output before the explicit process exit so large results are complete without leaving runtime handles alive.
  - Preserve and enforce claim-key patterns, uniqueness, and paired provenance through MCP schema registration.
  - Synchronize the corrected skill into the Codex and Cursor bundles.

- 3ede96b: The semantic advisor and predicate suggester are now explicitly identified as read-only MCP tools, so non-interactive clients can safely run modeling checks without prompting for approval. Newly created empty branch stores are also persisted immediately, preventing a successful first read from leaving later reads in an unstable state.

  - Mark `kb_semantic_advisor` read-only and idempotent in the MCP tool annotations.
  - Mark `kb_suggest_predicates` read-only and idempotent in the MCP tool annotations.
  - Save a newly attached empty branch KB before serving subsequent requests.

- Updated dependencies [5e4e126]
- Updated dependencies [6d66110]
- Updated dependencies [750ff49]
- Updated dependencies [2a85fc8]
- Updated dependencies [a28d325]
- Updated dependencies [38f72bf]
- Updated dependencies [2d93976]
- Updated dependencies [2f9073c]
- Updated dependencies [a52b592]
  - kibi-cli@0.17.0
  - kibi-core@0.8.0

## 0.19.2

### Patch Changes

- 610b5be: Generic agents can now discover and load Kibi's bundled skills through a documented MCP-first flow, with a structured CLI fallback when MCP is unavailable. Skill tools also advertise that they are local, read-only, idempotent operations so compatible agent hosts can present safer tool affordances without treating those hints as authorization.

  - Add host-neutral progressive-disclosure onboarding guidance to the agent and MCP references.
  - Advertise MCP behavior annotations for `kb_skills_list`, `kb_skills_load`, and `kb_skills_read`.

- e21c62e: Stopping Kibi MCP during an active search now cancels the Prolog work immediately instead of leaving shutdown blocked behind the request. Both SIGINT and SIGTERM complete graceful parent shutdown and reap the SWI-Prolog child.

  - Register graceful shutdown for SIGINT as well as SIGTERM.
  - Terminate the Prolog worker before awaiting in-flight request settlement.

- Updated dependencies [80d5173]
- Updated dependencies
- Updated dependencies
- Updated dependencies [28dba1f]
- Updated dependencies [b2b1792]
- Updated dependencies [610b5be]
  - kibi-cli@0.16.0
  - kibi-core@0.7.1

## 0.19.1

### Patch Changes

- 6abc7ea: Operators can now run semantic requirement analysis through the dedicated `semantic-advisor --input` CLI route with the same JSON contract and deterministic suggestions as MCP. MCP and upsert analysis now reuse the shared CLI implementation, so ambiguity witnesses and modeling advice stay aligned without starting Prolog.

  - Move semantic-advisor analysis, types, coverage evaluation, and execution into size-bounded `kibi-cli` modules.
  - Replace the MCP semantic-advisor implementation with a thin shared-executor adapter and update upsert imports.

- 212fe1c: CLI and MCP checks now run the same validation executor, so both interfaces report the same violations for equivalent inputs. The CLI retains its staged workflow, fix suggestions, path overrides, dry-run behavior, and human-readable output while JSON input gains explicit parity coverage for impact diagnostics.

  - Route non-staged CLI validation and MCP `kb_check` through the shared check executor.
  - Preserve CLI advisory-quality and exit-code semantics in its adapter.
  - Add executable CLI/MCP check parity and JSON impact-option coverage.

- 8c3a2e9: CLI and MCP operation changes now have an executable semantic parity safety net. Contributors get immediate failures when an operation is missing, duplicated, or returns transport-specific business data.

  - Add isolated seeded workspace fixtures for all 18 catalog operations.
  - Compare CLI JSON and in-memory MCP results after narrowly scoped volatile-field normalization.
  - Enforce exact catalog-to-parity-case registry completeness.

- 6c132ee: Operators can use `find-gaps`, `coverage`, and `graph` through either CLI flags or JSON input with the same results exposed by MCP. The existing `gaps` command remains available as an alias, while reporting defaults and traversal bounds stay unchanged.

  - Move find-gaps, coverage, and graph execution into shared `kibi-cli` operation specs.
  - Replace MCP reporting business logic with thin shared-executor adapters.
  - Route legacy reporting commands and JSON input through the shared operation protocol.

- 23e815a: Agents can now keep using Kibi when MCP tools are unavailable but a trusted project-local CLI is ready. Guidance across Cursor, OpenCode, and MCP documentation now selects the interface by capability and stops for operator action only when neither safe surface is available.

  - Replace MCP-exclusive guidance with the visible-MCP, trusted-CLI JSON route, and blocked state machine.
  - Preserve direct `.kb/` access prohibitions, discovery-before-mutation, sequential writes, and completion validation gates.

- 0a8a5d3: CLI and MCP users now receive real requirement-modeling and predicate-suggestion plans through the same shared operation executors. Prolog-backed status and reports work reliably again, nested skill commands accept JSON input, and compatibility errors no longer block parity verification.

  - Move modeling execution into `kibi-cli` and keep MCP handlers as thin adapters.
  - Split modeling internals into reviewable modules and use the operation workspace context for migration checks.
  - Restore compatible Prolog query, validation, deletion, and error behavior.
  - Align the MCP dependency range with the released CLI version and remove silent OpenCode catches.

- 212fe1c: Remote SPARQL SELECT queries now produce the same decoded rows through the CLI JSON route and MCP tool. Network access remains opt-in and HTTP(S)-only, while caller-provided timeouts retain their existing whole-second behavior.

  - Share endpoint, query, timeout, request, and result-decoding logic through the CLI operation executor.
  - Route CLI and MCP adapters through an explicit network port and verify parity against a local HTTP fixture.

- a0fee4a: MCP tools now delegate to shared operation executors in kibi-cli, ensuring semantic parity with CLI routes. Existing MCP clients keep the same public contract while gaining a single implementation path shared with the CLI.

  - Preserve all tool names, schemas, and wire formats without breaking changes.
  - Require the kibi-cli minor release that provides the shared operations catalog.

- c229a35: CLI and MCP operations now run through explicit, transport-neutral contexts while each transport keeps ownership of its own lifecycle. This makes one-shot CLI execution and persistent MCP sessions predictable without changing MCP tool behavior.

  - Add public operation runtime, capability-port, and lifecycle types to `kibi-cli`.
  - Add separate CLI and MCP runtime adapters with write-only MCP stamp refresh.
  - Route MCP registrations through runtime-backed operation specs while preserving timeout, diagnostics, and in-flight request handling.

- e71f1ce: Cursor dogfood sessions now keep each linked worktree as the Kibi data workspace while launching a compatible built MCP runtime from that worktree or its primary checkout. Invalid, stale, or unrelated builds are rejected without installing packages, and Cursor hooks offer the project-local CLI only as advisory guidance after explicit workspace trust.

  - Add deterministic build, runtime, SWI-Prolog, and package-version checks to the Cursor worktree resolver.
  - Preserve an explicit `KIBI_WORKSPACE` when the MCP diagnostic launcher starts from another runtime root.
  - Track MCP capability as `observed` or `unknown` and keep hook-driven CLI fallback non-executing.

- 6c132ee: Skill discovery now returns the same bundled metadata, content hashes, and declared resources through CLI JSON routes and MCP tools. This makes scripted CLI usage consistent with agent-facing skill loading while preserving the existing human-oriented `kibi skills` commands.

  - Share bundled skill list, load, and resource-read executors between CLI and MCP.
  - Exercise all three skill operations through the executable CLI/MCP parity harness.

- 212fe1c: CLI users can now validate and apply one MCP-shaped upsert payload through `validate-upsert --input` and `upsert --input`, including stdin input. Both transports now enforce the same relationship, contradiction, strict-fact, audit, symbol-granularity, durability, and rollback behavior.

  - Move validated upsert execution behind shared Prolog, filesystem, save, and symbol-refresh ports.
  - Keep MCP handlers as thin compatibility adapters and verify CLI/MCP graph-state parity.
  - Ensure a failed relationship prevents save and leaves no partial entity or edge state.

- 6c132ee: Operators now get the same query, search, and status results whether they use familiar CLI flags, JSON input, or MCP. Existing table output, discovery flags, ranking, pagination, relationship display, and status freshness behavior remain available while the execution paths can no longer drift independently.

  - Move query, search, and status business logic into shared `kibi-cli` operation executors.
  - Replace MCP discovery implementations with thin shared-executor adapters.
  - Route human CLI commands and JSON protocol input through runtime-backed shared operations.

- efa3c7e: Autopilot bootstrap synthesis now returns the same deterministic candidates, payoff guidance, and exact review-only apply plans through CLI JSON and MCP. Cold-start analysis no longer launches Prolog unnecessarily, making scripted bootstrap previews faster while preserving confidence and candidate safety bounds.

  - Share port-backed autopilot discovery, candidate construction, and result generation in `kibi-cli`.
  - Route `autopilot-generate --input` and `kb_autopilot_generate` through the same executor and parity harness.

- Updated dependencies [6abc7ea]
- Updated dependencies [212fe1c]
- Updated dependencies [8c3a2e9]
- Updated dependencies [6c132ee]
- Updated dependencies [cafa25f]
- Updated dependencies [0a8a5d3]
- Updated dependencies [212fe1c]
- Updated dependencies [a0fee4a]
- Updated dependencies [c229a35]
- Updated dependencies [6c132ee]
- Updated dependencies [212fe1c]
- Updated dependencies [6c132ee]
- Updated dependencies [efa3c7e]
  - kibi-cli@0.15.0

## 0.19.0

### Minor Changes

- f1db710: Coverage reports now explain how deep each requirement's test evidence goes without changing existing covered/uncovered semantics. CLI users and MCP clients can distinguish direct passing e2e evidence, scenario-backed e2e evidence, unit-only evidence, nonpassing test evidence, scenario-only coverage, and no evidence at all. Typed test verification fields are honored before legacy e2e tag/path heuristics, so modern test metadata produces more reliable coverage labels.

  Technical summary:

  - Add additive `coverageDepth` / `coverage_depth` fields and coverage evidence lists to requirement coverage rows.
  - Classify coverage depth from direct requirement tests, scenario tests, test statuses, and typed `verification_scope` values.
  - Surface coverage depth in CLI table output and MCP structured coverage results while preserving existing summary and `coverageStatus` fields.
  - Allow typed `verification_scope` and `verification_perspective` test fields through CLI/MCP entity schemas and MCP upsert serialization.

- f1db710: Kibi check outputs now have a stable advisory diagnostics lane for auditability review signals. Operators and MCP clients can receive `qualityDiagnostics` alongside hard `violations` without advisory-only findings changing pass/fail counts or exit behavior. Existing staged impact failures, including symbol granularity violations, remain blocking. Source impact analysis now also highlights overly broad symbols, indistinguishable symbol coordinates, and mixed-purpose component/class ownership as review-only guidance.

  Technical summary:

  - Add the public `QualityDiagnostic` type with `error`, `warning`, `review`, and `info` severities plus explicit `blocking` semantics.
  - Preserve existing `violations`, `diagnostics`, and `impactDiagnostics` fields while adding MCP structured `qualityDiagnostics` output support.
  - Preserve explicitly filtered MCP `kb_check` rule semantics so advisory full-KB quality scans only run for unfiltered checks or requested impact diagnostics.
  - Clarify Codex and Cursor bundled agent guidance so targeted checks use explicit rules and final checks omit rules for full-KB `qualityDiagnostics` review.
  - Add quality diagnostic text formatting and shared blocking helpers that treat `blocking: true` or `severity: "error"` as hard failures.
  - Add non-blocking `multi_requirement_symbol_review`, `duplicate_symbol_coordinate_review`, and `component_mixed_purpose_review` impact diagnostics.

### Patch Changes

- 439cb2e: Kibi now makes semantic Prolog adoption easier to measure and debug. Diagnostic usage logs expose semantic advisor readiness, predicate suggestion outcomes, upsert semantic readiness, and contradiction failures as structured fields instead of generic success/error text. Operators can opt into predicate-link audits and get Prolog validation query-plan safety checked by default, with normal `.kb/config.json` overrides available when needed.

  Technical summary:

  - Add `predicate-verifiability` as a default-off KB check rule that flags `requires_predicate` targets whose `fact_kind` is not `predicate`.
  - Add `query-plan-safety` as a default-enabled KB check rule that flags Prolog validation clauses that place negation before later generator calls.
  - Enrich MCP diagnostic usage fields for `kb_semantic_advisor`, `kb_suggest_predicates`, and `kb_upsert`.
  - Classify requirement contradiction errors as `semantic_contradiction` validation failures with actionable hints.
  - Preserve semantic context in CLI sync/rebuild validation errors instead of reducing Prolog failures to `Query returned false`.
  - Extend prose coverage with real Align annotation time-key and merge-policy requirements.
  - Refresh changed Prolog check modules through the MCP aggregated check loader.

- 224f18b: Agents and hook users now get clearer guidance when behavior-changing staged files are missing Kibi impact evidence. The staged check points to the staged-impact workflow, explains that MCP KB writes do not automatically stage tracked markdown or manifest evidence, and tells users which files to stage before rerunning the hook. MCP validation also catches invalid relationship shortcuts earlier, and bundled skill loading makes follow-up resources easier to discover.

  Technical summary:

  - Add Prolog-backed relationship tuple preflight to `kb_validate_upsert` when invoked through MCP.
  - Improve invalid relationship and relationship-source mismatch guidance in MCP upsert flows.
  - Include declared skill resources in `kb_skills_load` visible text and missing-resource errors.
  - Update staged impact diagnostic docs and bundled Kibi usage resources for requirement-mediated behavior-fix evidence.

- Updated dependencies [48b65b9]
- Updated dependencies [f1db710]
- Updated dependencies [f1db710]
- Updated dependencies [439cb2e]
- Updated dependencies [f1db710]
- Updated dependencies [cb8d977]
- Updated dependencies [224f18b]
  - kibi-cli@0.14.0
  - kibi-core@0.7.0

## 0.18.1

### Patch Changes

- Symbol metadata writes now work consistently through MCP and the underlying Prolog schema. Agents can create source-linked symbol entities with `symbol_role` and `granularity_reason` metadata without hitting a transaction failure after JSON validation succeeds. This keeps behavioral-anchor traceability usable from the MCP-first workflow.

  Technical summary:

  - Add `symbol_role` and `granularity_reason` to the Prolog entity schema copies shipped by `kibi-core` and `kibi-cli`.
  - Serialize `granularity_reason` as a Prolog atom in `kb_upsert` transactions.
  - Add Prolog and MCP regression coverage for symbol metadata fields.

- Updated dependencies
  - kibi-core@0.6.5
  - kibi-cli@0.13.1

## 0.18.0

### Minor Changes

- Kibi now gives agents source-impact feedback while they are still editing, instead of waiting for the commit hook to be the first signal. Meaningful source edits can be checked through MCP with changed-file impact diagnostics, so agents see coarse symbol ownership, stale symbol evidence, and semantic-review prompts while the source context is fresh. OpenCode, Cursor, and Codex adapters now steer agents toward that MCP-first workflow and keep CLI/hooks as the later safety net.

  Technical summary:

  - Add reusable CLI changed-file impact diagnostics and export them for MCP consumption.
  - Extend MCP `kb_check` with source-file impact options and structured impact output.
  - Update OpenCode, Cursor, and Codex guidance/hooks to request impact-enabled `kb_check` after source edits.
  - Document semantic-review diagnostics and class-member granularity expectations.

### Patch Changes

- Updated dependencies
  - kibi-cli@0.13.0

## 0.17.5

### Patch Changes

- Kibi now gives agents clearer guidance for the diagnostics flow, so the release notes should reflect that the bundled usage text and MCP logging story were tightened together.

  This update also keeps the package mirrors aligned where applicable, which helps downstream plugin consumers stay in sync with the canonical guidance.

  - Hardened bundled skill guidance for kibi usage.
  - Improved MCP diagnostic logging shape and validation hints.
  - Synced packaged skill copies where they are shipped with the release.

- Updated dependencies
  - kibi-cli@0.12.8

## 0.17.4

### Patch Changes

- 5d2975a: MCP integration tests that exercise kb.pl directly now reuse one persistent SWI-Prolog session instead of spawning a new process on every query under Bun. That cuts wall-clock time for the heaviest suites (for example `check.test.ts`) without changing test semantics.

  - Add `packages/mcp/tests/helpers/integration-prolog.ts` with `startIntegrationProlog` / `stopIntegrationProlog` helpers.
  - Migrate check, CRUD, upsert, and transaction-integrity integration tests to the shared-session fixture.

- Updated dependencies [71fcf0b]
  - kibi-core@0.6.4

## 0.17.3

### Patch Changes

- 5119f39: **Fix stale KB state in `kb_check` after runtime upserts.**

  Previously, after `kb_upsert` wrote runtime relationships and called `kb_save`, the MCP session's TypeScript-side `attachedBranchStamp` was not updated to match the new disk state. When `kb_check` (or any other tool) subsequently called `ensureProlog()`, it detected a stamp mismatch and triggered a `kb_detach` → `kb_attach` refresh cycle. This reload unloaded the in-memory RDF graph and reloaded `kb.rdf` from disk — but because the TypeScript stamp was stale, the reload happened even though the disk already contained the runtime relationships. In environments where background syncs or other processes could modify `kb.rdf`, this caused `kb_check` to evaluate against an outdated snapshot instead of the live KB state.

  **Changes:**

  - **`packages/mcp/src/server/session.ts`**: Export `attachedBranchKbPath` and add `updateAttachedBranchStamp()` so mutation tools can keep the session stamp in sync after saves.
  - **`packages/mcp/src/tools/upsert.ts`**: After `kb_save` succeeds, read the fresh disk stamp via `readBranchKbStamp` and update the session stamp. This prevents the next `ensureProlog()` call from triggering an unnecessary (and potentially destructive) refresh.
  - **`packages/mcp/src/tools/check.ts`**: Add `prolog.invalidateCache()` at the start of `handleKbCheck`, aligning read-only check behavior with `kb_graph` and ensuring no stale query cache interferes with violation detection.

- 53447ac: fix: prevent relationship loss on entity-only property updates in kibi-mcp

  When `kb_upsert` omits the relationships field (entity-only property update), existing relationships were silently lost because the handler only processed the provided relationship array. Now the handler queries the live KB for existing relationships when the field is not provided and includes them in the transaction, preventing accidental relationship deletion on property-only updates.

  Also fixes a syntax error in `fetchExistingRelationships` caused by incorrect indentation of the for loop body, which prevented compilation on Bun's indent-aware parser.

- Updated dependencies
  - kibi-core@0.6.3

## 0.17.2

### Patch Changes

- `kb_upsert` now warns when adding a `verified_by(req,test)` relationship to a requirement that has existing scenarios. The edge is still created, but the warning explains that direct req→test verification does not satisfy `symbol-coverage` for scenario-backed requirements — use `verified_by(scenario,test)` or `validates(test,scenario)` instead.

  - `kibi-mcp`: added non-blocking guidance in `handleKbUpsert` for insufficient direct req→test coverage links.
  - Added regression tests for warning presence/absence based on scenario configuration.

- Updated dependencies
- Updated dependencies [c810f5f]
  - kibi-cli@0.12.7
  - kibi-core@0.6.2

## 0.17.1

### Patch Changes

- 5fdcd46: MCP now re-validates the attached branch KB whenever the same-branch snapshot is externally rebuilt, so running `kibi sync --rebuild` no longer leaves a long-running server stuck on stale data. If refresh cannot be reconciled, requests fail fast with explicit `KbRefreshError` behavior instead of silently continuing from a stale attachment.

  - Added formal docs for same-branch KB freshness detection in MCP, including stat-based stamps and fail-closed retry semantics.
  - Clarified CLI behavior so `--rebuild` is documented as triggering MCP auto-refresh on unchanged branch attachments where applicable.
  - Added KB entities/ADR/requirements evidence and symbol traceability updates for the MCP session refresh path.

- 37ce479: Semantic advisor suggestions now recognize more requirement shapes found in real product repositories. Agents get reviewable predicate plans for build constraints, environment safety, schema invariants, coding standards, migration boundaries, absence/removal requirements, offline behavior, release gates, platform consistency, and preservation rules instead of falling back to generic prose.

  - Add built-in predicate schemas, usage hints, extraction, and advisor detections for ten product-audit families.
  - Extend deterministic prose coverage fixtures and MCP predicate/advisor tests for the new families.
  - Document the expanded advisory-only predicate coverage in agent-facing docs.

- 37ce479: Semantic advisor suggestions now avoid two broad false positives that came from product workflow prose. Generic user-facing “must use” requirements no longer route to coding-standard predicates, and generic “must pass before” workflow prerequisites no longer route to release-gate predicates unless the prose includes code/build/release cues.

  - Add negative coverage for product usage and checkout prerequisite prose in `kb_suggest_predicates` and `kb_semantic_advisor`.
  - Tighten `coding_standard_rule` and `release_gate_rule` exact scoring/detection to require domain-specific cues.

- 37ce479: Semantic advisor suggestions now cover five additional real-product requirement families from product KB audits. Agents can model abstraction boundaries, security configuration requirements, ordered strategy selection, refresh policies, and scoped authorization without falling back to generic ontology-gap observations.

  - Add built-in predicate schemas, usage hints, extraction, scoring, and advisor receipt suggestions for `abstraction_boundary_rule`, `security_configuration_rule`, `ordered_strategy_rule`, `refresh_policy_rule`, and `scoped_authorization_rule`.
  - Extend deterministic prose coverage fixtures and direct MCP predicate/advisor tests for the new families.
  - Document the expanded advisory-only predicate catalog in agent-facing docs.

- 37ce479: Semantic advisor suggestions now recognize more real-product phrasing without requiring users to rewrite requirements into catalog-shaped prose. Declarative absence, cap-at numeric limits, disabled-until guards, when/must conditionals, and deduplicated redundant request prose now produce reviewable strict or predicate modeling suggestions.

  - Add phrase-variant coverage for `absence_requirement`, strict cap-at properties, `guard`, `conditional_behavior`, and `idempotency_rule`.
  - Harden predicate keyword scoring so short keywords match whole words instead of substrings such as `event` inside `prevent`.
  - Preserve existing save/navigation ranking with exact commit-action scoring and explicit navigation keyword variants.

- 37ce479: Semantic advisor coverage now handles additional broad requirement shapes found in product KB audits. Requirements about documentation obligations, warmup behavior, visual layout consistency, enforcement location, reconciliation cleanup, throttling policies, migration-boundary variants, API-avoidance coding standards, and readiness ordering now produce reviewable semantic suggestions instead of generic observation gaps.

  - Add built-in predicate schemas and advisor detections for documentation standards, warmup policies, visual layout rules, enforcement-location rules, reconciliation rules, and throttling policies.
  - Extend migration-boundary, coding-standard, and temporal-order phrase handling for product-style requirement prose.
  - Expand deterministic coverage fixtures and direct MCP predicate/advisor tests for the remaining product-audit examples.

- Updated dependencies [5fdcd46]
- Updated dependencies [37ce479]
  - kibi-cli@0.12.6

## 0.17.0

### Minor Changes

- 9132558: Agents now get semantic modeling guidance before or during requirement writes. When a requirement contains machine-checkable prose, Kibi explains why Prolog cannot reason over it yet and suggests draft strict facts, predicates, ambiguity observations, or ontology-gap observations.

  This makes prose-heavy requirements visible as logic debt instead of silently accepting them as contradiction-checkable knowledge, while still leaving all suggestions advisory and reviewable.

  - Add a read-only `kb_semantic_advisor` tool for raw prose modeling suggestions before agents construct `kb_upsert` payloads.
  - Add MCP semantic advisor receipts with modeling suggestions for upsert validation and upsert responses.
  - Detect deterministic modeling signals for numeric, cardinality, conditional, permission, state/default, and modal prose.
  - Add usage hints to production predicate candidates and align the predicate catalog with semantic advisor suggestions, including rate-limit, exception, mutual-exclusion, dependency, ownership, retry, escalation, availability SLA, notification routing, idempotency, data residency, audit logging, consent, lifecycle, conflict-resolution, fallback, batching, and consistency predicates.
  - Add a prose coverage corpus evaluator so semantic advisor coverage is measurable rather than anecdotal.
  - Produce draft apply plans for strict-property suggestions, predicate suggestions, ambiguity observations, and ontology-gap observations, including multi-claim prose, thresholds, booleans, defaults, uniqueness, state memberships, state transitions, conditional behavior, temporal ordering, prohibitions, and comparative numeric constraints.
  - Document advisory v1 behavior and recommended repair paths.

## 0.16.1

### Patch Changes

- 909be41: Agents now get clearer guidance when modeling Kibi facts and predicates. Instead of opaque validation errors that encourage falling back to prose, common mistakes now point to exact snake_case fields and typed value payloads.

  The documentation also gives agents a compact path for choosing between requirements, strict facts, predicate facts, observations, and metadata. This makes semantic KB modeling easier to apply consistently across product projects.

  - Improve `kb_upsert` diagnostics for camelCase fact fields and incomplete strict/predicate facts.
  - Add modeling-helper warnings for low-confidence requirement downgrades and ontology-gap predicate suggestions.
  - Add modeling cheatsheet, MCP error reference, and product KB improvement prompt.

- c724c8b: Kibi now treats symbol granularity as a behavioral traceability decision instead of assuming every exported declaration is an equally precise target. Agents can model behavior hidden inside factory or composition expressions with manual behavioral anchors, while interfaces, type aliases, and enums no longer block valid coarse behavioral links by themselves. This makes traceability stricter where real behavior symbols exist and more flexible when extractors only see type-shape declarations.

  Technical summary:

  - Added `symbol_role` metadata for symbol entities.
  - Added shared role-aware symbol granularity helpers.
  - Updated MCP upsert and CLI staged checks to reject coarse links only when narrower behavioral symbols are available.
  - Documented manual behavioral anchors for extractor-miss cases.

- 7f4d51e: Kibi now uses more of SWI-Prolog's maintained standard library to make graph reporting clearer and to pilot derived validation facts internally. MCP users also get an opt-in remote SPARQL query tool for querying external RDF endpoints without changing Kibi's local RDF storage model. The new SPARQL surface is explicitly remote-only, validates HTTP(S) endpoints, and keeps network-dependent behavior outside the normal local KB query path.

  - Refactored Prolog relationship counting to use `library(aggregate)`.
  - Added an isolated CHR-derived facts pilot module for bounded validation facts.
  - Added a remote SPARQL client wrapper and `kb_sparql_remote` MCP tool.

- Updated dependencies [909be41]
- Updated dependencies [c724c8b]
- Updated dependencies [7f4d51e]
  - kibi-cli@0.12.5
  - kibi-core@0.6.1

## 0.16.0

### Minor Changes

- d3675be: Agents now have a guided way to turn prose requirements into ontology predicates instead of falling back to unstructured notes. The new predicate suggestion flow recommends reusable predicate shapes, returns a ready-to-apply `requires_predicate` plan when one fits, and produces an explicit ontology-gap observation when Kibi needs a new schema. This makes the ontology lane easier for agents to follow and harder to bypass accidentally.

  - Add `kb_suggest_predicates` with a broad built-in predicate catalog for state transitions, guards, persistence actions, accessibility, retention, resource constraints, feature gates, and events.
  - Return ranked predicate candidates plus deterministic `structuredContent.applyPlan` payloads for `fact_kind: predicate` or `review:ontology-gap` fallback facts, with `relationshipPlan` guidance for safe `requires_predicate` attachment.
  - Update MCP/runtime guidance so agents spell out requirement prose, request predicate suggestions, and only use prose observations when no candidate fits.

### Patch Changes

- 4d13def: Agents can now link requirements directly to class methods when that is the narrowest meaningful code symbol. Method-level symbol upserts use `ClassName.methodName` identities, with bare method names accepted only when they are unique in the file. This reduces unnecessary `extractor-miss` workarounds and keeps traceability closer to the behavior being changed.

  - Add qualified `method` symbols to parser-backed symbol analysis and staged symbol extraction for exported classes.
  - Include exported class methods in MCP symbol granularity validation so method-level `kb_upsert` calls are accepted without allowing duplicate bare-name collisions.
  - Update symbol granularity documentation to name class methods as narrow traceability targets.

- Updated dependencies [4d13def]
  - kibi-cli@0.12.4

## 0.15.3

### Patch Changes

- Timed-out MCP tool calls now recover cleanly instead of leaving stale Prolog workers behind. Follow-up Kibi tool calls should be able to continue with a fresh worker after a timeout, reducing the need for users to manually find and terminate wedged `swipl` processes.

  Technical summary:

  - Add MCP tool execution timeout handling with owned Prolog worker reset.
  - Classify timeout and Prolog worker reset diagnostics in usage metrics.
  - Harden interactive Prolog timeout termination and repeated termination cleanup.

- Updated dependencies
  - kibi-cli@0.12.3

## 0.15.2

### Patch Changes

- 8b73781: Bootstrap guidance is now easier for agents to apply correctly in OpenCode. The `/init-kibi` workflow and bundled Kibi usage skill explain that OpenCode can expose canonical `kb_*` MCP tools with a `kibi_` server prefix, and autopilot bootstrap output now includes an explicit `applyPlan` so agents can preview exact writes before asking for approval.

  - `kibi-mcp`: expose aggregate `structuredContent.applyPlan`/top-level `applyPlan` from `kb_autopilot_generate`, preserve `/init-kibi` as a post-hoc bootstrap prompt, mention it in visible output, and advertise typed fact fields in the `kb_upsert` input schema.
  - `kibi-opencode`: document the OpenCode `kibi_kb_*` tool-name convention in `/init-kibi` alias guidance and README.
  - `kibi-cli`: update the bundled `kibi-usage` skill with host-prefix guidance for OpenCode users.

- 35f3944: Kibi now records MCP tool failures with structured error categories and stages, so operators can tell persistence conflicts, Prolog runtime failures, lifecycle failures, and validation errors apart without manually inspecting raw logs. Usage metrics now surface those categories across all tools instead of only grouping `kb_upsert` failures, making incidents like stale snapshots or Prolog startup errors easier to diagnose.

  - `kibi-mcp`: add diagnostic error classification fields (`error_name`, `error_category`, `error_stage`, `error_summary`) to handler error rows in `.kb/usage.log`.
  - `kibi-cli`: extend `usage-metrics` reports with cross-tool error category, stage, and tool breakdowns while preserving existing upsert error summaries.

- Updated dependencies [8b73781]
- Updated dependencies [35f3944]
  - kibi-cli@0.12.2

## 0.15.1

### Patch Changes

- Kibi now blocks coarse symbol traceability when narrower source symbols are available. Agents that try to attach ownership, coverage, or executable identity to a module/file-level symbol must either link the specific function/class/type symbol instead or provide an explicit coarse-link reason, making lazy file-level ontology entries much harder to create accidentally. Existing repositories should run `kibi migrate --dry-run` and then `kibi migrate --yes`; the migration marks old coarse links as `legacy-link` so users can upgrade without breaking immediately on historical ontology data.

  - Add staged `symbol_granularity_violation` enforcement for coarse symbol manifest relationships when changed source files expose granular symbols.
  - Add MCP `kb_upsert` validation that rejects unjustified coarse symbol traceability before writing to the KB.
  - Bump the KB schema version and teach `kibi migrate` to mark existing coarse symbol links with `granularity_reason: legacy-link`.
  - Add `granularity_reason` support for accepted coarse-link exceptions: `config-artifact`, `module-level-behavior`, `extractor-miss`, and `legacy-link`.

- Updated dependencies
  - kibi-cli@0.12.1

## 0.15.0

### Minor Changes

- Kibi can now start representing project-local ontology claims as structured predicate facts instead of prose-only notes. This is the first compatibility slice toward richer domain modeling: teams can define predicate schemas and store ground predicate claims while existing strict property facts continue to work unchanged.

  Add predicate ontology fact fields to the CLI entity schema, public schema export, TypeScript fact types, and Prolog schema validation. The new supported fact lanes are `predicate_schema` and `predicate`, with fields for predicate names, namespaces, arity, arguments, aliases, examples, and predicate polarity.

### Patch Changes

- Updated dependencies
  - kibi-core@0.6.0
  - kibi-cli@0.12.0

## 0.14.3

### Patch Changes

- MCP clients no longer see or call the removed `kb_briefing_generate` tool. This makes the public tool list match the supported Kibi workflow and avoids clients depending on a briefing surface that no longer exists. Mutations continue to work without producing pending brief artifacts.

  Technical summary:

  - Remove the briefing tool and pending marker implementation from generated MCP dist.
  - Update packed MCP E2E expectations so `kb_briefing_generate` is absent and unknown.

- Updated dependencies
  - kibi-cli@0.11.3

## 0.14.2

### Patch Changes

- 4aa9830: Kibi now has a reusable markdown skill subsystem across CLI, MCP, and OpenCode. The CLI exposes bundled skills with manifest validation and safe resource loading. The MCP server provides progressive-disclosure tools (`kb_skills_list`, `kb_skills_load`, `kb_skills_read`) for agents to discover and read skills without starting Prolog or touching the KB. OpenCode routes its guidance through the `kibi-usage` skill, giving agents a single source of truth for Kibi usage patterns. An official `kibi-usage` skill bundle ships with all three packages, covering fact lanes, relationship directions, and canonical workflows.

  - feat(cli): add markdown skill loader with manifest types, validation errors, secure path/resource validation, and size limits
  - feat(cli): expose `kibi-cli/skills` public export with `skills list`, `skills load`, `skills read`, `skills validate`
  - feat(mcp): add `kb_skills_list`, `kb_skills_load`, `kb_skills_read` tool definitions, handlers, runtime wiring, and docs rendering
  - feat(mcp): resolve bundled skills from packaged source assets when running from compiled CLI output
  - feat(opencode): route agent guidance through `kibi-usage` skill, add `kb_skills_load` to tool listings
  - docs: add official `kibi-usage` skill with fact lanes, relationship directions, and workflow guidance
  - test: add mock-free MCP handler tests against real bundled `kibi-usage` skill, including invalid skill and resource errors
  - test: add CLI skill unit coverage for valid bundles, validation errors, traversal/symlink escapes, oversize limits

- Updated dependencies [4aa9830]
  - kibi-cli@0.11.1

## 0.14.1

### Patch Changes

- fb0e3ec: MCP server startup now detects when a running process was launched from a stale installation path and automatically re-resolves the current project-local package. This prevents the module-not-found errors that could occur after upgrading kibi-mcp when a package manager, editor, or launcher had cached an old resolved path. The packed upgrade regression now runs reliably in CI by checking out the source fixtures it needs and hydrating legacy pnpm fixture dependencies before the offline current-package upgrade. Users can inspect startup resolution at any time with `--print-resolution` and enable debug diagnostics via `KIBI_MCP_DEBUG=1`.

  - Added startup-resolution module with stale-vs-current path comparison
  - Added `--print-resolution` flag to kibi-mcp for diagnostic startup path inspection
  - Added `KIBI_MCP_DEBUG=1` env var support for resolution diagnostics on stderr
  - Added project-local re-entry when stale running package is detected
  - Added clean-package-tarballs script for packed artifact hygiene
  - Fixed packed e2e CI source checkout for MCP upgrade and tarball verification jobs
  - Fixed pnpm packed upgrade regression setup so legacy fixture dependencies are available before offline current-package upgrade

## 0.14.0

### Minor Changes

- ba9da28: Users now automatically receive rich, semantic briefs when they modify knowledge base entities through MCP tools. Instead of seeing only file names and timestamps, briefs now tell a clear story about what changed—like "Requirement AUTH-001 was superseded by AUTH-002"—making it easier to understand the impact of KB updates and track knowledge evolution across branches.

  - **kibi-mcp**: `kb_upsert` and `kb_delete` now write brief-pending markers to `.kb/briefs/pending/` on successful mutation.
  - **kibi-opencode**: Added idle handler that consumes pending markers, graph-narrative engine for inferring semantic stories, and enhanced brief generation with user-centric narratives (headline, domain changes, relationship changes). TUI delivery shows "Kibi Knowledge Update" toast.

### Patch Changes

- f8a3a88: This update introduces a split symbol coordinate workflow that separates logical symbol definitions from their physical source locations. Symbol coordinates are now managed in `documentation/symbol-coordinates.yaml`, which improves git diff readability and reduces merge conflicts when only line numbers change. The `kibi sync` command now supports a `--refresh-symbol-coordinates` flag to explicitly update these locations.

  - **kibi-cli**: Added `--refresh-symbol-coordinates` flag to `kibi sync` and updated pre-commit hooks to enforce coordinate staging.
  - **kibi-mcp**: Updated symbol resolution logic to read from the new split coordinate manifest.
  - **kibi-opencode**: Updated background sync behavior and documentation to support the split manifest workflow.
  - **kibi-vscode**: Updated the symbol resolver to consume the split `symbol-coordinates.yaml` file for navigation and hover features.

- Updated dependencies [f8a3a88]
- Updated dependencies [d783b67]
  - kibi-cli@0.11.0

## 0.13.0

### Minor Changes

- 5f715a5: Kibi now automatically respects your repository's `.gitignore` rules during knowledge base discovery. Files ignored by Git — as well as tool directories like `.sisyphus` and `.opencode` — are no longer treated as domain knowledge sources. This prevents draft and build artifacts from polluting your knowledge base.

  - Added documentation describing the repository ignore policy and hard-denied directories.
  - Clarified that Kibi honors repository `.gitignore`, nested `.gitignore`, and `.git/info/exclude` during `kb_autopilot_generate`, briefing generation, and discovery.
  - Documented that global Git excludes are not honored in v1, and that automatic cleanup of previously-discovered KB entities is out of scope for this release.
  - Integrated a note about ignore-aware file-event skipping in the OpenCode plugin README.

### Patch Changes

- Updated dependencies [5f715a5]
  - kibi-cli@0.10.0

## 0.12.1

### Patch Changes

- Kibi now supports fully automated requirement modeling and schema migrations, allowing repositories to stay up-to-date with the latest contradiction-safe modeling standards without manual intervention. The new system enforces strict readiness levels for requirement/fact pairings and automatically downgrades low-confidence claims to non-blocking observations to ensure high precision in conflict detection.

  - add `kibi migrate` command for automated KB schema upgrades
  - implement strict readiness checks and confidence-based modeling lanes
  - update MCP guidance and CLI documentation for automated contradiction workflows
  - extend inference rules to support v1 contradiction semantics (exact-value, range, polarity)

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - kibi-core@0.5.3
  - kibi-cli@0.9.0

## 0.12.0

### Minor Changes

- 4746f3f: Briefs no longer surface internal task-tracking artifacts (such as `.sisyphus/boulder.json`) as if they were meaningful project knowledge. Notifications are now specific-or-silent: a toast only appears when the brief can say what changed and why it matters. Previously, any `.sisyphus/` file edit could trigger a brief with generic content and produce a vague "a brief is available" notification regardless of whether it contained real domain context.

  - `kibi-cli`: adds `isOperationalArtifactPath(pathLike)` helper, exported as `kibi-cli/operational-artifacts`, matching `.sisyphus/**` paths as operational task-tracking artifacts
  - `kibi-mcp`: filters operational artifact sources, entities, and citations before brief content is assembled so `.sisyphus/**` changes never appear in brief entities, citations, prompt blocks, or TLDRs
  - `kibi-opencode`: suppresses brief eligibility for operational-only source changes; adds specificity gate to toast delivery so generic/operational envelopes do not trigger notifications
  - `kibi-vscode`: applies same specific-or-silent semantics to VS Code brief watcher so generic/operational envelopes do not call `showInformationMessage`

### Patch Changes

- 2a00e15: Kibi discovery is now less noisy for broad agent queries. When agents send multi-intent natural-language searches, targeted domain-specific entities now rank above unrelated generic results. No-signal queries (containing only common stop words) return an empty result instead of arbitrary token-coverage matches. OpenCode agents are now guided to decompose broad queries into focused probes and follow up with exact `kb_query` lookups.

  - `kibi-cli`: Add stop-word filtering, hyphen normalization, plural normalization, and minimum-score threshold to `search-ranking.ts`; add synthetic regression corpus tests.
  - `kibi-mcp`: Add wrapper-level regression tests asserting improved ranking is preserved end-to-end.
  - `kibi-opencode`: Update injected agent guidance to instruct query decomposition with concrete examples.

- Updated dependencies [4746f3f]
- Updated dependencies [7880675]
- Updated dependencies [2a00e15]
- Updated dependencies [8d8ebf6]
  - kibi-cli@0.8.0

## 0.11.0

### Minor Changes

- 736f675: Add the interactive cold-start bootstrap flow and its regression coverage so the public MCP surface, OpenCode prompt wiring, and extractor exports stay in sync.

### Patch Changes

- 699a482: Create append-only contract documentation and release metadata for the Kibi briefing schema-2.0 session-delta migration. This update introduces high-fidelity change tracking anchored to the session start, prioritized change narratives for MCP-cited entities, and deterministic filename-based brief selection for VS Code.
- efdacbc: Session-local baseline counts, semantic content-hash dedupe, compact promptBlock fallback, richer envelope fields, and VS Code popup-first UX. The OpenCode plugin now scopes audit deltas to the current session instead of cumulative branch totals, deduplicates briefs by normalized visible-content hash rather than briefId, and surfaces constraints, regression risks, and missing evidence in the envelope. The MCP server gracefully degrades the prompt block with compact truncation instead of returning empty content when over budget.
- Updated dependencies [b9ef9a2]
- Updated dependencies [7ed9f0c]
- Updated dependencies [a1a198b]
- Updated dependencies [699a482]
- Updated dependencies [736f675]
  - kibi-cli@0.7.0
  - kibi-core@0.5.2

## 0.10.0

### Minor Changes

- 2bd0804: Kibi can now generate citation-backed start-task briefings through MCP with `kb_briefing_generate`, making it easier for agents to begin risky work from source-linked project context.

  OpenCode now surfaces that workflow through `/brief-kibi`, so teams can trigger the same Kibi briefing path directly from the editor before acting.

## 0.9.0

### Minor Changes

- Kibi can now generate citation-backed start-task briefings through MCP with `kb_briefing_generate`, making it easier for agents to begin risky work from source-linked project context.

  OpenCode now surfaces that workflow through `/brief-kibi`, so teams can trigger the same Kibi briefing path directly from the editor before acting.

## 0.8.0

### Minor Changes

- 2066a48: Add init-kibi autopilot generation workflow

  - New MCP tool `kb_autopilot_generate` for read-only candidate generation
  - Activation-state classification and source discovery helpers
  - Deterministic candidate generation for Kibi docs and symbol manifests
  - Conservative generic markdown heuristics for ADR/REQ/FACT candidates
  - Dedupe logic and payoff summary reporting
  - Aligned OpenCode prompt guidance with activation workflow

### Patch Changes

- 4c1ae86: Fix `kb_autopilot_generate` workspace discovery so it respects env-provided workspace roots, excludes vendored markdown trees during generic scanning, and returns zero candidates for vendored-only temporary repos.
- Updated dependencies [2066a48]
  - kibi-cli@0.6.2

## 0.7.1

### Patch Changes

- 0ec1cb1: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- 4a74281: Enable `noUncheckedIndexedAccess` incrementally across the source packages and add explicit guards where CLI parsing and traceability helpers read indexed values.
- 3a11e57: Fix `kibi status` JSON serialization before first sync and add `kibi-mcp --help` output
- 0ec1cb1: Accept `sourceFile` as an optional entity property during `kb_upsert`.

  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

- de5dbaf: Enable `exactOptionalPropertyTypes` across source packages and tighten optional property handling in exported type surfaces.
- Updated dependencies [0ec1cb1]
- Updated dependencies [4a74281]
- Updated dependencies [0ec1cb1]
- Updated dependencies [0ec1cb1]
- Updated dependencies [0ec1cb1]
- Updated dependencies [3a11e57]
- Updated dependencies [0ec1cb1]
- Updated dependencies [de5dbaf]
  - kibi-core@0.5.1
  - kibi-cli@0.6.1

## 0.7.0

### Minor Changes

- Prepare fresh minor release line for schema and traceability alignment

  This release includes the completed traceability schema realignment work,
  ensuring proper symbol-to-requirement linking, staged traceability checks,
  and the updated release automation model.

### Patch Changes

- Updated dependencies
  - kibi-core@0.5.0
  - kibi-cli@0.6.0

## 0.6.1

### Patch Changes

- 6cdf9f5: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- 7111197: Accept `sourceFile` as an optional entity property during `kb_upsert`.

  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

- Updated dependencies [6cdf9f5]
- Updated dependencies [efc7fd7]
- Updated dependencies [d344f57]
- Updated dependencies [2994632]
- Updated dependencies [7111197]
  - kibi-core@0.4.1
  - kibi-cli@0.5.1

## 0.6.0

### Minor Changes

- 0c2c1e7: feat(traceability): document comment-free test workflow with validation parity

  - Add relationship-first traceability guidance: prefer split semantics with `implements` for production ownership, `covered_by` for production coverage, and `executable_for` plus `verified_by`/`validates` for test identity and verification instead of relying only on inline `// implements REQ-xxx` comments
  - Document staged symbol traceability enforcement with both workflow paths: relationship-based (preferred) and comment-based (optional/backward-compatible)
  - Synchronize guidance across AGENTS.md, CLI reference, and LLM rules with the implemented policy
  - Staged enforcement now supports explicit KB relationships in addition to inline comments
  - Document scope boundary: automatic extraction of framework-specific `test()` or `it()` callbacks is out of scope for staged check

### Patch Changes

- Updated dependencies [0c2c1e7]
  - kibi-core@0.4.0
  - kibi-cli@0.5.0

## 0.5.2

### Patch Changes

- 3388cf3: Add CI-only diagnostic logging for symbol coordinate refresh to help isolate the refreshCoordinatesForSymbolId coverage failure on GitHub Actions.
- 9137133: Replace mock.module-based symbol refresh mocking in MCP upsert tests with a test seam to prevent cross-file leakages under coverage.
- 49fcad9: Harden OpenCode smart enforcement with posture-aware guidance, deterministic risk routing, structured observability, and an explicit advisory-vs-hook boundary.

  - `kibi-opencode`: adds repo-posture detection, risky-edit classification, smart-enforcement cache/config, posture-aware prompt injection, effective-mode gating, single-block prompt budget, prompt-visible completion reminders, runtime maintenance overlay, selective event routing, and structured smart-enforcement logs.
  - `kibi-cli`: documents and tests hooks as the hard enforcement boundary while preserving branch/post-merge refresh behavior.
  - `kibi-mcp`: enriches diagnostic usage fields so rollout telemetry remains queryable without changing the public MCP surface.

- Updated dependencies [3388cf3]
- Updated dependencies [49fcad9]
  - kibi-cli@0.4.3

## 0.5.1

### Patch Changes

- c0d09e0: Add comprehensive `kb_upsert` unit coverage for validation, encoding, transaction failure handling, and symbol coordinate refresh paths.
- Updated dependencies [7309d18]
  - kibi-cli@0.4.2

## 0.5.0

### Minor Changes

- 7bd2adf: Add typed fact schema, semantic contradiction model, and discovery bundle tools.

  - **Typed facts**: New `fact_kind` field (subject, property_value, observation, meta) with schema validation, preserved through CLI/MCP sync and query round-trips.
  - **Discovery bundle**: `kb_search`, `kb_find_gaps`, `kb_coverage`, `kb_graph` tools across MCP and CLI. Richer `kb_check` summaries and improved diagnostic usage logging.
  - **Agent guidance**: Updated to prefer discovery-first workflows (`kb_search` → `kb_query`), MCP-only policy aligned with ADR-016 thin-bridge architecture.
  - **Strict-fact validation**: Append-only requirement supersession and migration guidance for strict fact adoption.

### Patch Changes

- 7bd2adf: Bug fixes and Node.js v24 compatibility.

  - **Node 24**: Replace deprecated `import ... assert` with `import ... with` per TC39 Import Attributes proposal.
  - **Core**: Use `member/2` instead of `memberchk/2` in `relationship_allowed`; make `status_meta_dict` resilient to non-standard KB paths.
  - **CLI**: Fix staged traceability check to resolve symbol IDs from `symbols.yaml` using both `sourceFile` and legacy `source` fields.
  - **MCP**: Replace `escapeQuotes` with `toPrologString` for safe Prolog string encoding.
  - **Persistence**: Remove duplicate `ATOM_FIELDS`, add `value_int` integer guard, use `toPrologString` for safe escaping.
  - **Check**: Replace fragile regex violation parsers with `parseViolationRows` from codec.
  - **Tests**: Isolate workspace test from rogue `/tmp/.git`, add 30s timeout to `beforeAll` hooks to prevent flaky timeouts.

- 7bd2adf: Internal code quality improvements and refactoring.

  - Deduplicate `splitTopLevel` into single canonical function in `codec.ts`.
  - Deduplicate `Violation`, `ChecksConfig`, and rule definitions between CLI and MCP.
  - Extract `safeCleanupProlog` helper to eliminate duplicated teardown patterns.
  - Replace `process.exit()` with return values in CLI command handlers.
  - Remove dead code (`target-resolver.ts`), annotate empty catch blocks, remove unreachable code paths.
  - Add `toPrologString` helper, `parseViolationRows`, export `splitTopLevelGeneral` from codec.
  - Clean narration comments across all packages.

- 30e5f68: Clarified entity modeling guidance across documentation, especially distinguishing `flag` (runtime/config gate) from `fact` (bug/workaround records). Aligned MCP runtime self-documentation with canonical guidance.
- 12f8293: Fix MCP discovery and checks module resolution for installed package layouts

  Unify `resolveCorePlPath()` to derive peer Prolog modules (discovery.pl, checks.pl)
  from `path.dirname(resolveKbPlPath())` instead of using an independent `require.resolve()`
  call that can resolve to a different physical `kibi-core` tree in nested `node_modules`
  layouts. This fixes `kb_graph`, `kb_coverage`, and `kb_find_gaps` failing with
  `discovery.pl` module-load errors when npm hoists packages into separate trees.

- Updated dependencies [7bd2adf]
- Updated dependencies [7bd2adf]
- Updated dependencies [7bd2adf]
  - kibi-core@0.3.0
  - kibi-cli@0.4.0

## 0.3.3

### Patch Changes

- Fix `--diagnostic-mode` support and server version reporting (fixes #97)

  - `--diagnostic-mode` now properly enables diagnostic logging to `.kb/usage.log`
  - Server version now dynamically reads from `package.json` instead of hardcoded value
  - Added usage logging with tool call telemetry (timestamp, duration, status, branch, prolog PID)
  - Fixed version drift: server now reports `0.3.2` matching the package version
  - Added source-level implementation in `src/` ensuring published package behavior matches source

## 0.3.2

### Patch Changes

- Fix `--diagnostic-mode` support: the flag now properly enables diagnostic logging to `.kb/usage.log`. Previously the flag was parsed but not implemented in the published package. Also fixes server version reporting to dynamically read from `package.json` instead of hardcoded `0.2.1`.
- bc020dd: Generate unit-test LCOV coverage in CI, upload it to Codecov using the repository's CODECOV_TOKEN secret, and add a README coverage badge alongside the main CI status badge.
- Updated dependencies [bc020dd]
- Updated dependencies [e61aa15]
- Updated dependencies [6e9e15c]
  - kibi-cli@0.2.7

## 0.3.1

### Patch Changes

- 5188a8f: Fix `kb_upsert` status validation so documented entity-specific lifecycle values like `open`, `passing`, and `accepted` are accepted again. The MCP tool schema now avoids advertising a stale fixed status enum, and the shared entity schema accepts both documented statuses and legacy compatibility values.
- 715c28a: Fix MCP write and validation consistency by making `kb_upsert` atomic across entity and relationship assertions, and aligning `kb_check` with the full aggregated rule set plus `.kb/config.json` check settings. This prevents partial writes on failed relationship links and keeps MCP traceability checks consistent with CLI expectations.
- Fix `kibi sync` false dangling-relationship warnings by validating relationship shards after entity IDs are loaded, repair sync cache `seenAt` timestamps so invalid cache entries trigger a safe re-import instead of silently skipping files, and harden KB persistence so read-only query/check flows no longer rewrite live RDF snapshots.
- 5188a8f: Remove unused internal MCP tool modules that are no longer part of the supported four-tool public surface. This reduces dead code and makes unit coverage reflect the live server behavior more accurately.
- Updated dependencies [4e05344]
- Updated dependencies [5188a8f]
- Updated dependencies
  - kibi-core@0.1.10
  - kibi-cli@0.2.6

## 0.3.0

### Minor Changes

- 582bede: Add `init-kibi` MCP prompt for retroactive repository bootstrapping. Update existing prompts with telemetry-driven best practices. Refresh tool descriptions with safety-focused guidance.

### Patch Changes

- Updated dependencies [29de3fa]
- Updated dependencies [0b11a77]
  - kibi-core@0.1.9
  - kibi-cli@0.2.5

## 0.2.4

### Patch Changes

- Fix MCP query consistency after upsert by normalizing source lookups and stabilizing tag filtering/dedup behavior.

  This resolves inconsistent `kb_query` results across `sourceFile` and `tags` filters and prevents duplicate entities when multiple tags match.

- Updated dependencies
  - kibi-core@0.1.8

## 0.2.3

### Patch Changes

- Fix `kb_query` behavior for `{ id, type }` lookups so missing entities return an empty result instead of a `Query failed` execution error.

  Add regression coverage to validate `delete -> query(id+type)` consistency in persistent MCP sessions.

## 0.2.2

### Patch Changes

- Fix stale read behavior in interactive MCP sessions by invalidating cached Prolog query results after successful write operations.

  Add a persistent-session regression test that verifies create/read/update/read and delete/read consistency in one MCP process.

- Updated dependencies
  - kibi-cli@0.2.3

## 0.2.1

### Patch Changes

- 82b9742: Fix issue #53 npm consumer regressions

  - Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
  - Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
  - Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
  - Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
  - Added packed tarball E2E regression tests covering installed package behavior

- Updated dependencies [82b9742]
  - kibi-core@0.1.7
  - kibi-cli@0.2.2
