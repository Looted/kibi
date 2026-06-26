# kibi-core

## 0.6.5

### Patch Changes

- Symbol metadata writes now work consistently through MCP and the underlying Prolog schema. Agents can create source-linked symbol entities with `symbol_role` and `granularity_reason` metadata without hitting a transaction failure after JSON validation succeeds. This keeps behavioral-anchor traceability usable from the MCP-first workflow.

  Technical summary:

  - Add `symbol_role` and `granularity_reason` to the Prolog entity schema copies shipped by `kibi-core` and `kibi-cli`.
  - Serialize `granularity_reason` as a Prolog atom in `kb_upsert` transactions.
  - Add Prolog and MCP regression coverage for symbol metadata fields.

## 0.6.4

### Patch Changes

- 71fcf0b: Symbol-coverage checks no longer false-flag production symbols when other requirements in the same knowledge base have scenarios. Previously, the direct req→test fallback path evaluated negation before binding the requirement ID, so populated graphs could report missing coverage even when `covered_by`, `verified_by`, and semantics were all correct.

  - Reorder `test_covers_requirement/2` subgoals in `packages/core/src/kb.pl` so `requirement_verified_by_test/2` binds `Req` before `requirement_test_fallback_allowed/1` runs NAF.
  - Add `production_symbol_coverage_works_with_unbound_req_when_other_reqs_have_scenarios` regression test in `packages/core/tests/kb.plt`.

## 0.6.3

### Patch Changes

- **Fix reverse relationship lookups in the knowledge base.**

  Previously, querying a relationship with a bound target ID but an unbound source ID (for example, "which requirement does this test verify?") could fail silently. That broke traceability paths that rely on `verified_by` edges — symbol coverage checks and MCP reverse relationship queries could miss valid links even when the data was present.

  **Changes:**

  - **`packages/core/src/kb.pl`**: Add shared `entity_id_to_uri/2` and `entity_uri_to_id/2` helpers; rewrite `kb_relationship/3` to branch on bound source/target IDs (forward, reverse, exact, and enumerate modes); align relationship assert and entity URI builders to the same canonical prefix notation.
  - **`packages/core/tests/kb.plt`**: Add reverse `verified_by` lookup and `production_symbol_covered_for_requirement` coverage tests for the `verified_by`-only path.

## 0.6.2

### Patch Changes

- c810f5f: Symbol-coverage violations now explain that direct `verified_by(Req,Test)` and `validates(Test,Req)` relationships may be blocked when a requirement uses scenarios. The diagnostics now tell you to use `verified_by(Scenario,Test)` or `validates(Test,Scenario)` instead, depending on your test graph.

  This change improves check clarity when requirements are tied to scenarios, and it shortens the fix cycle for missing or blocked coverage.

  - `kibi-core`: improved symbol-coverage diagnostics in `checks.pl` to reflect scenario-aware coverage rules.
  - Added regression coverage in tests for direct requirement-to-test coverage checks with scenarios.

## 0.6.1

### Patch Changes

- 7f4d51e: Kibi now uses more of SWI-Prolog's maintained standard library to make graph reporting clearer and to pilot derived validation facts internally. MCP users also get an opt-in remote SPARQL query tool for querying external RDF endpoints without changing Kibi's local RDF storage model. The new SPARQL surface is explicitly remote-only, validates HTTP(S) endpoints, and keeps network-dependent behavior outside the normal local KB query path.

  - Refactored Prolog relationship counting to use `library(aggregate)`.
  - Added an isolated CHR-derived facts pilot module for bounded validation facts.
  - Added a remote SPARQL client wrapper and `kb_sparql_remote` MCP tool.

## 0.6.0

### Minor Changes

- Kibi can now start representing project-local ontology claims as structured predicate facts instead of prose-only notes. This is the first compatibility slice toward richer domain modeling: teams can define predicate schemas and store ground predicate claims while existing strict property facts continue to work unchanged.

  Add predicate ontology fact fields to the CLI entity schema, public schema export, TypeScript fact types, and Prolog schema validation. The new supported fact lanes are `predicate_schema` and `predicate`, with fields for predicate names, namespaces, arity, arguments, aliases, examples, and predicate polarity.

## 0.5.3

### Patch Changes

- Kibi now supports fully automated requirement modeling and schema migrations, allowing repositories to stay up-to-date with the latest contradiction-safe modeling standards without manual intervention. The new system enforces strict readiness levels for requirement/fact pairings and automatically downgrades low-confidence claims to non-blocking observations to ensure high precision in conflict detection.

  - add `kibi migrate` command for automated KB schema upgrades
  - implement strict readiness checks and confidence-based modeling lanes
  - update MCP guidance and CLI documentation for automated contradiction workflows
  - extend inference rules to support v1 contradiction semantics (exact-value, range, polarity)

## 0.5.2

### Patch Changes

- 699a482: Create append-only contract documentation and release metadata for the Kibi briefing schema-2.0 session-delta migration. This update introduces high-fidelity change tracking anchored to the session start, prioritized change narratives for MCP-cited entities, and deterministic filename-based brief selection for VS Code.

## 0.5.1

### Patch Changes

- 0ec1cb1: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- 3a11e57: Fix `kibi status` JSON serialization before first sync and add `kibi-mcp --help` output
- 0ec1cb1: Accept `sourceFile` as an optional entity property during `kb_upsert`.

  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

## 0.5.0

### Minor Changes

- Prepare fresh minor release line for schema and traceability alignment

  This release includes the completed traceability schema realignment work,
  ensuring proper symbol-to-requirement linking, staged traceability checks,
  and the updated release automation model.

## 0.4.1

### Patch Changes

- 6cdf9f5: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- 7111197: Accept `sourceFile` as an optional entity property during `kb_upsert`.

  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

## 0.4.0

### Minor Changes

- 0c2c1e7: feat(traceability): document comment-free test workflow with validation parity

  - Add relationship-first traceability guidance: prefer split semantics with `implements` for production ownership, `covered_by` for production coverage, and `executable_for` plus `verified_by`/`validates` for test identity and verification instead of relying only on inline `// implements REQ-xxx` comments
  - Document staged symbol traceability enforcement with both workflow paths: relationship-based (preferred) and comment-based (optional/backward-compatible)
  - Synchronize guidance across AGENTS.md, CLI reference, and LLM rules with the implemented policy
  - Staged enforcement now supports explicit KB relationships in addition to inline comments
  - Document scope boundary: automatic extraction of framework-specific `test()` or `it()` callbacks is out of scope for staged check

## 0.3.0

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

## 0.1.10

### Patch Changes

- 4e05344: Synchronize core status semantics with the documented entity-specific lifecycle values so requirement and ADR derivations treat canonical states like `open`, `in_progress`, `closed`, `accepted`, `deprecated`, and `superseded` consistently.
- Fix `kibi sync` false dangling-relationship warnings by validating relationship shards after entity IDs are loaded, repair sync cache `seenAt` timestamps so invalid cache entries trigger a safe re-import instead of silently skipping files, and harden KB persistence so read-only query/check flows no longer rewrite live RDF snapshots.

## 0.1.9

### Patch Changes

- 29de3fa: Bump patch version for safe release

## 0.1.8

### Patch Changes

- Fix `kb_entities_by_source` Prolog predicate to use `source=` (matching entity property format) instead of `source-`, and normalize source values via `source_value_atom/2` to handle both atom and string types.

  This resolves inconsistent `kb_query` results when filtering by `sourceFile`.

## 0.1.7

### Patch Changes

- 82b9742: Fix issue #53 npm consumer regressions

  - Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
  - Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
  - Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
  - Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
  - Added packed tarball E2E regression tests covering installed package behavior
