# kibi-cli

## 0.6.1

### Patch Changes

- 0ec1cb1: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- 4a74281: Enable `noUncheckedIndexedAccess` incrementally across the source packages and add explicit guards where CLI parsing and traceability helpers read indexed values.
- 0ec1cb1: fix(cli): merge working-tree manifests with staged overrides in buildManifestLookup

  - `kibi check --staged` now pre-populates `manifestLookup` from the working-tree
    `config.paths.symbols` manifest before processing staged-manifest overrides.
    This prevents code-only staged changes (where `symbols.yaml` is not staged) from
    falling back to hash-generated IDs and incorrectly failing traceability even when
    the symbol is already linked in the KB.
  - Remove duplicate `toPrologString` in `temp-kb.ts` and reuse the shared
    `toPrologString` from `../prolog/codec` to keep Prolog serialisation consistent.

- 0ec1cb1: fix(opencode): respect absolute configured KB doc roots in bootstrap detection

  - Treat absolute `paths.*` entries in `.kb/config.json` as authoritative when checking whether a workspace is bootstrapped.
  - Add a regression test covering healthy absolute custom doc roots while preserving the existing missing-target bootstrap warning.

  fix(cli): restore prolog codec exports

  - Regenerate the checked-in `src/prolog/codec.js` artifact so `toPrologString` and `toPrologAtom` are available as named exports at runtime, fixing CLI traceability test imports.

- 0ec1cb1: fix(cli): eliminate 2-second false wait during PrologProcess startup under Bun

  - `PrologProcess.waitForReady()` previously looped for up to 2000ms waiting for any stdout/stderr output from `swipl`.
  - Under Bun v1.3.6, spawned `swipl` does not emit output until stdin is written, causing every `start()` to waste ~2 seconds.
  - The fix sends `true.\n` to stdin immediately after spawn and waits for the `true.` response, reducing startup detection time from ~2000ms to ~50ms.
  - This resolves the `temp-kb.test.ts` timeout under bare `bun test` and significantly speeds up all CLI tests that spawn Prolog processes.

- 3a11e57: Fix `kibi status` JSON serialization before first sync and add `kibi-mcp --help` output
- 0ec1cb1: Accept `sourceFile` as an optional entity property during `kb_upsert`.

  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

- de5dbaf: Enable `exactOptionalPropertyTypes` across source packages and tighten optional property handling in exported type surfaces.
- Updated dependencies [0ec1cb1]
- Updated dependencies [3a11e57]
- Updated dependencies [0ec1cb1]
  - kibi-core@0.5.1

## 0.6.0

### Minor Changes

- Prepare fresh minor release line for schema and traceability alignment

  This release includes the completed traceability schema realignment work,
  ensuring proper symbol-to-requirement linking, staged traceability checks,
  and the updated release automation model.

### Patch Changes

- Updated dependencies
  - kibi-core@0.5.0

## 0.5.1

### Patch Changes

- 6cdf9f5: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- efc7fd7: fix(cli): merge working-tree manifests with staged overrides in buildManifestLookup

  - `kibi check --staged` now pre-populates `manifestLookup` from the working-tree
    `config.paths.symbols` manifest before processing staged-manifest overrides.
    This prevents code-only staged changes (where `symbols.yaml` is not staged) from
    falling back to hash-generated IDs and incorrectly failing traceability even when
    the symbol is already linked in the KB.
  - Remove duplicate `toPrologString` in `temp-kb.ts` and reuse the shared
    `toPrologString` from `../prolog/codec` to keep Prolog serialisation consistent.

- d344f57: fix(opencode): respect absolute configured KB doc roots in bootstrap detection

  - Treat absolute `paths.*` entries in `.kb/config.json` as authoritative when checking whether a workspace is bootstrapped.
  - Add a regression test covering healthy absolute custom doc roots while preserving the existing missing-target bootstrap warning.

  fix(cli): restore prolog codec exports

  - Regenerate the checked-in `src/prolog/codec.js` artifact so `toPrologString` and `toPrologAtom` are available as named exports at runtime, fixing CLI traceability test imports.

- 2994632: fix(cli): eliminate 2-second false wait during PrologProcess startup under Bun

  - `PrologProcess.waitForReady()` previously looped for up to 2000ms waiting for any stdout/stderr output from `swipl`.
  - Under Bun v1.3.6, spawned `swipl` does not emit output until stdin is written, causing every `start()` to waste ~2 seconds.
  - The fix sends `true.\n` to stdin immediately after spawn and waits for the `true.` response, reducing startup detection time from ~2000ms to ~50ms.
  - This resolves the `temp-kb.test.ts` timeout under bare `bun test` and significantly speeds up all CLI tests that spawn Prolog processes.

- 7111197: Accept `sourceFile` as an optional entity property during `kb_upsert`.

  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

- Updated dependencies [6cdf9f5]
- Updated dependencies [7111197]
  - kibi-core@0.4.1

## 0.5.0

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

## 0.4.3

### Patch Changes

- 3388cf3: Add CI-only diagnostic logging for symbol coordinate refresh to help isolate the refreshCoordinatesForSymbolId coverage failure on GitHub Actions.
- 49fcad9: Harden OpenCode smart enforcement with posture-aware guidance, deterministic risk routing, structured observability, and an explicit advisory-vs-hook boundary.

  - `kibi-opencode`: adds repo-posture detection, risky-edit classification, smart-enforcement cache/config, posture-aware prompt injection, effective-mode gating, single-block prompt budget, prompt-visible completion reminders, runtime maintenance overlay, selective event routing, and structured smart-enforcement logs.
  - `kibi-cli`: documents and tests hooks as the hard enforcement boundary while preserving branch/post-merge refresh behavior.
  - `kibi-mcp`: enriches diagnostic usage fields so rollout telemetry remains queryable without changing the public MCP surface.

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
