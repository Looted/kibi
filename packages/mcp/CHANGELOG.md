# kibi-mcp

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
