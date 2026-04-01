# kibi-cli

## 0.4.2

### Patch Changes

- 7309d18: Export `__test__` helpers from `traceability/validate.ts` to enable unit testing of internal Prolog parsing utilities.

## 0.4.1

### Patch Changes

- c8761a9: Add fallback support for unique non-exported top-level functions and class methods during symbol coordinate refresh. Resolves symbols that were previously reported as failed.
- 46baebc: Export resolveKbPlPath from kibi-cli public prolog surface

  Add `resolveKbPlPath` to the public `kibi-cli/prolog` export so that `kibi-mcp`
  can import it without breaking against older `kibi-cli` versions that do not
  expose this symbol.

## 0.4.0

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

- Updated dependencies [7bd2adf]
- Updated dependencies [7bd2adf]
  - kibi-core@0.3.0

## 0.2.7

### Patch Changes

- bc020dd: Generate unit-test LCOV coverage in CI, upload it to Codecov using the repository's CODECOV_TOKEN secret, and add a README coverage badge alongside the main CI status badge.
- e61aa15: Load SWI-Prolog's `rdf_db` library in interactive CLI sessions so `rdf_transaction/1` mutation queries do not fall into interactive correction prompts and hang MCP requests that rely on the long-lived Prolog process.
- 6e9e15c: Import plain string Markdown frontmatter `links` as generic `relates_to`
  relationships during `kibi sync`, and fix `kibi query --relationships` so it
  returns outgoing relationships reliably. Also fix `kibi-opencode` tarball ESM
  imports and self-contained plugin typings so packed installs can build and load
  the plugin and helper subpath exports in Node.

## 0.2.6

### Patch Changes

- 5188a8f: Fix `kb_upsert` status validation so documented entity-specific lifecycle values like `open`, `passing`, and `accepted` are accepted again. The MCP tool schema now avoids advertising a stale fixed status enum, and the shared entity schema accepts both documented statuses and legacy compatibility values.
- Fix `kibi sync` false dangling-relationship warnings by validating relationship shards after entity IDs are loaded, repair sync cache `seenAt` timestamps so invalid cache entries trigger a safe re-import instead of silently skipping files, and harden KB persistence so read-only query/check flows no longer rewrite live RDF snapshots.
- Updated dependencies [4e05344]
- Updated dependencies
  - kibi-core@0.1.10

## 0.2.5

### Patch Changes

- 0b11a77: Add missing `./prolog/codec` export to package.json

  The MCP package imports `escapeAtom` and `toPrologAtom` from `kibi-cli/prolog/codec`,
  but this subpath was not exported in the package.json. This caused the MCP server
  to crash on startup with `ERR_PACKAGE_PATH_NOT_EXPORTED` when the package was
  installed from npm.

- Updated dependencies [29de3fa]
  - kibi-core@0.1.9

## 0.2.4

### Patch Changes

- ec7f86e: Fix sync command to process relationship shards added after initial sync. The sync command now properly detects and imports relationship shard files (`.kb/relationships/*.yaml`) that are added after the first sync, instead of exiting early with "no changes".

## 0.2.4

### Patch Changes

- Fix sync command to process relationship shards added after initial sync. The sync command now properly detects and imports relationship shard files (`.kb/relationships/*.yaml`) that are added after the first sync, instead of exiting early with "no changes".

- Add explicit `id` fields to sync test fixtures for predictable relationship testing.

## 0.2.3

## 0.2.3

### Patch Changes

- Fix stale read behavior in interactive MCP sessions by invalidating cached Prolog query results after successful write operations.

  Add a persistent-session regression test that verifies create/read/update/read and delete/read consistency in one MCP process.

## 0.2.2

### Patch Changes

- 82b9742: Fix issue #53 npm consumer regressions

  - Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
  - Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
  - Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
  - Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
  - Added packed tarball E2E regression tests covering installed package behavior

- Updated dependencies [82b9742]
  - kibi-core@0.1.7
