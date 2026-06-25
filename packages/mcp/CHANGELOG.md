# kibi-mcp

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
