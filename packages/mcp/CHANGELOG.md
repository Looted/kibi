# kibi-mcp

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
  - Align guidance across AGENTS.md, CLI reference, and LLM rules with the implemented policy
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
