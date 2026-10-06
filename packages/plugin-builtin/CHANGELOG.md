# kibi-plugin-builtin

## 0.4.2

### Patch Changes

- 2a2b2db: Every Kibi package page on npm now has a README that says what the package is for and how to install it, and links to the documentation site. Package metadata now points npm's "Homepage" link at the documentation site, its "Repository" link at the package's own folder on GitHub, and adds an "Issues" link.

  Adds READMEs to `kibi-cli`, `kibi-mcp`, `kibi-core`, `kibi-runtime`, `kibi-agent-core`, `kibi-codex`, `kibi-plugin-builtin` and `kibi-plugin-sdk`. Sets `homepage` to https://looted.github.io/kibi/, adds `repository.directory` and `bugs` to every package, and refreshes the `kibi-plugin-treesitter` integrity manifest and source-analyzer approval for its changed `package.json`.

- Updated dependencies [2a2b2db]
  - kibi-plugin-sdk@0.4.1

## 0.4.1

### Patch Changes

- d25a626: Kibi now answers questions on a CI checkout or any detached commit, compiles a cold knowledge base minutes faster, and can stop a runaway read before it blocks other agents. On a bare SHA, search, query, status, check, coverage and graph read a snapshot of that checkout and say so in every answer, while writes are refused with the command that fixes it. A cold `kibi sync` of the Kibi repository went from about 4 min 23 s to 19 s, and `--refresh-symbol-coordinates` from about 5 min 55 s to 26 s, with byte-identical results.
  - Detached HEAD with zero or several local branches at HEAD: read-only operations (CLI routes, human commands, MCP tools) attach a read-only snapshot store (`kibi-internal/detached-head-snapshot`) compiled incrementally from the checkout's tracked sources, and add a `detached_head_read_only` warning diagnostic with the commit, branches at HEAD, store path and `writes: "refused"`. Write operations and `kibi sync` refuse with an actionable message (`git switch <branch>`, `git switch -c <branch>`, or `KIBI_BRANCH`). One branch at HEAD still attaches that branch exactly; no branch KB is ever guessed or written. `kibi engine stop/status` address the snapshot daemon, and `kibi gc` keeps the snapshot while it is in use.
  - Sync: source-owned entity lookups before retracts run in batches of 200 instead of one engine round trip per path candidate; the Prolog client wakes on the answer frame instead of a 50 ms poll; TypeScript coordinate enrichment adds every source file before the first export check, so the type checker program is built once instead of once per file.
  - Engine read limits: `KIBI_ENGINE_READ_TIME_LIMIT_MS` and `KIBI_ENGINE_READ_INFERENCE_LIMIT` (opt-in, unset by default) bound each read-only engine request with `call_with_time_limit/2` and `call_with_inference_limit/3`. A read that hits its limit fails with `QUERY_LIMIT_EXCEEDED` and `error.details.limitExceeded` (`kind`, `limit`) on the CLI and MCP envelopes, never with a partial answer; write requests, module loads and sync compilation are never bounded, while the read-only queries a write operation such as `kb_upsert` runs before writing count as reads and can stop it before anything is written.
  - A CLI JSON route whose runtime cannot open (a detached HEAD refusing a write, no branch to attach) now prints an `OPERATION_FAILED` error envelope on stdout, not just a message on stderr.

## 0.4.0

### Minor Changes

- db5376c: Kibi can now analyze source in Python, Go, Rust and a broader set of common programming and configuration languages, offline, while JavaScript and TypeScript keep working as before. Staged checks read source and authored knowledge from one immutable Git tree, inspect both sides of every change, and keep incomplete analysis explicit instead of treating it as proof. Large files now return an explicit analysis failure instead of a second validation error.
  - Add the asynchronous `kibi.symbol-extractor.v2` contract with validated UTF-16 ranges, bounded inputs and host-assigned provenance, plus a ts-morph v2 adapter.
  - Add the optional `kibi-plugin-treesitter` package with pinned WASM grammars, queries, licenses and an approved-analyzer closure verified before import.
  - Capture staged and explicit-diff snapshots from Git objects; merge duplicate symbol-manifest records deterministically and fail conflicting authored fields with `SOURCE_DUPLICATE_CONFLICT`.
  - Add opt-in, bounded parser-phase and Prolog round-trip timing observations that never enter result schemas.

### Patch Changes

- 8622782: An impact review prepared on one machine now still validates in CI, and the MCP server and the CLI agree on whether it is current. Checks only block on incomplete source analysis the author can act on: the committed side of a change never blocks, and a known analyzer limitation such as a Rust macro or a Python decorator matters only where it overlaps the changed lines. Syntax, parse, timeout and integrity problems in the staged file still block. Long-running hosts no longer grow memory with every analyzed file, and Tree-sitter analysis reuses warm workers instead of starting one per file.
  - Identify the impact evaluator by its contract version and the canonical JSON of the schemas it consumes, instead of hashing the installed file tree and `process.version`. Identify the builtin analyzer runtime by its package identity rather than its installed tree.
  - `kibi-runtime` bundles the CLI operations again (`kibi-cli` is a build-time dependency only); it no longer installs `kibi-cli`.
  - Add one shared analysis gate (`analysisObligation`) used by staged checks, impact-review preparation and validation, and impact reports.
  - Classify source paths from a single extension table in `source-classification`, with parity tests against the Tree-sitter catalog and the builtin extractor.
  - Remove analyzed files from the ts-morph project after each v1 and v2 analysis.
  - Add an optional `timeoutMs` budget to `SymbolExtractorV2AnalyzeInput`; the host sets it slightly below its own deadline, so providers report their own timeout. Tree-sitter uses a bounded, persistent worker pool with grammars loaded once per worker, and the host analyzes up to four changed files at a time.

- Updated dependencies [db5376c]
- Updated dependencies [8622782]
  - kibi-plugin-sdk@0.4.0

## 0.3.0

### Minor Changes

- 0128b56: Kibi now helps agents keep one shared vocabulary instead of letting every requirement invent its own. `kibi check` warns when two unrelated requirements state the same obligation. Units are compared in canonical form, so "30 min" matches "1800 s", and each warning names the exact facts involved. It also flags subject keys copied from a requirement ID, subject keys that don't follow `component.aspect`, predicates whose arguments read like prose, and entity files whose name doesn't match their ID. All of these are non-blocking warnings or info notes, so existing knowledge bases keep passing.

  When you model a new requirement, Kibi now ranks the subjects that already exist and either reuses one or explicitly declares a new one. It also flags claims that look like possible duplicates. An intentional restatement can be recorded with the new `restates` relationship. Skills and docs now recommend naming entities by the behavior they govern (`REQ-cli-gc`) instead of a sequence number (`REQ-042`). Existing numbered IDs stay valid.

  Predicate schemas can now declare the allowed values for an argument, plus the old spellings that map onto them. New facts must use those values. `kibi check` reports predicate facts that don't match any schema, and `kibi migrate` can fix the mechanical cases after you approve the plan hash. It moves a fact to the only namespace whose schema matches, and rewrites old spellings to the declared value. Everything that needs judgment stays a review item.
  - core: new `semantic_quality.pl` (`entity-id-style`, `domain-redundancy`, `domain-implication`, `subject-key-identity`, `subject-key-shape`, `ontology-quality`) and `units.pl`. Unit canonicalization is used for comparison only, and unknown or ambiguous units such as `KB` are never equated. Adds the `restates` req→req relationship and an optional `diagnosticSeverity` in the rule registry. Adds `:- encoding(utf8)` to modules that contain non-ASCII text.
  - cli/mcp: `restates` is wired through the extractors, schemas, and mutation paths. `entity-id-style` warnings are reported on `kb_upsert` creates and on staged added or renamed entity files. `kb_model_requirement` returns `vocabularyAlignment` (subject decision, candidates, redundancy candidates, stamps, `fallbackUsed`). Ontology-quality thresholds can be set with `KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO` / `KIBI_ONTOLOGY_QUALITY_MIN_FACTS`. `kb_compile_intent` create mode now keeps a caller-supplied `requirementId`. `kibi check --staged` now also prints its pass line when metadata-only staged changes have only advisory findings, matching the staged-symbol path.
  - cli/mcp: `predicate_schema` facts accept `argument_constants` and `argument_aliases`, stored like `rule_ir` as JSON. `kb_upsert` / `kb_validate_upsert` reject malformed vocabularies and predicate facts that use undeclared values or aliases. `kb_suggest_predicates` binds aliases to their constant and leaves undeclared values unbound. The new advisory TypeScript rule `predicate-schema-conformance` checks predicate facts against project schemas and the built-in catalog. Its mechanical repairs become automatic `predicate_schema_alignment` migration actions that carry the exact `kb_upsert` input and re-read the fact before writing.
  - core: `ontology-quality` findings name the prose-like arguments.
  - plugin-sdk: new `kibi.vocabulary-alignment.v1` capability (`rankSubjects`, `compareClaims`) with result validators.
  - plugin-builtin: deterministic offline provider (IDF-weighted subject ranking and negation- and quantity-aware claim similarity).
  - plugin-jev: Jev-backed provider. It runs in replace, augment, or shadow mode with builtin fallback, and makes network calls only when it is activated for `kb_model_requirement`. `kb_check` never calls a provider.
  - runtime and agent adapters: regenerated skill mirrors with the naming guidance and `restates` direction docs.

### Patch Changes

- e5ab646: `kibi status` and every CLI command start faster on large knowledge bases. On
  this repository, `kibi status` for a fresh KB drops from about 3 seconds to
  about 1.7, and a command that needs neither schema validation nor symbol
  extraction starts about 0.5 seconds sooner.
  - `kb_status_json` skips the full-entity stale-reason scan when the KB is
    fresh, because a fresh verdict already rules out every stale reason.
  - `kibi-plugin-builtin` loads ts-morph (the TypeScript compiler) on first
    symbol analysis instead of at import time.
  - The CLI compiles its entity and relationship JSON schemas on first use.

- Updated dependencies [0128b56]
  - kibi-plugin-sdk@0.3.0

## 0.2.0

### Minor Changes

- 783cc75: Coordinate enrichment, granularity candidate collection, and private-member helpers now live in `kibi-plugin-builtin`, so the CLI can analyze TypeScript/JavaScript symbols without depending on `ts-morph` directly. Hosts that only install `kibi-cli` still get the same enrichment and staged-symbol behavior through the builtin plugin.
  - Export `enrichSymbolCoordinatesWithTsMorph`, `collectGranularityCandidates`, `onlyCandidate`, and `isPrivateClassMember` from `kibi-plugin-builtin`
  - Thin-wrap those helpers from CLI `symbols-ts`, `symbol-granularity`, and `symbol-extract`
  - Drop `ts-morph` from `kibi-cli` runtime dependencies (kept as a test-only devDependency for AST spies)

- 783cc75: Kibi ships a default capability plugin package so TypeScript symbol extraction, ontology matching, and semantic lane classification live behind the public plugin protocol instead of private CLI paths.
  - Add `kibi-plugin-builtin@0.1.0` with `kibiPlugin` exporting all three capabilities
  - Built-in ts-morph extractor, ontology pack (launcher→core→policy→product→product-tail), and sync semantic classifier
  - CLI depends on this package and thin-wraps the extractor / ontology pack for default parity

### Patch Changes

- b375e8f: This maintenance update brings the affected package code and tests into line with Kibi's Biome checks while preserving runtime behavior. It also replaces MCP non-null assertions with receiver-preserving method calls.
  - Format affected files, sort imports, and remove unnecessary template literals.
  - Preserve EngineClient `this` when forwarding optional Prolog methods.

- e6571b4: External classifiers stay limited to the two allowlisted operations, ontology matches keep their claim keys through host composition, and CLI predicate rule tables now re-export the builtin pack so advisor and modeling cannot drift. Lane selection from the builtin classifier also accepts host snake_case signal shapes, which unblocks typecheck/build for capability-plugin call sites.
  - fix(builtin): chooseLane accepts kind-only LaneSignal (unblocks analysis-receipt typecheck)
  - feat(cli): stamp claimKey on composed ontology match candidates
  - refactor(cli): re-export predicate rule tables from kibi-plugin-builtin
  - chore(builtin): export rule sets + package.json subpath

- Updated dependencies [e6be0cc]
- Updated dependencies [8985874]
- Updated dependencies [783cc75]
  - kibi-plugin-sdk@0.2.0

## Unreleased

### Minor Changes

- Export TypeScript coordinate enrichment, granularity candidate collection,
  and private-member helpers so hosts (including `kibi-cli`) can drop a direct
  `ts-morph` dependency while keeping the same analysis behavior.

## 0.1.0

### Minor Changes

- Initial default capability plugin package: built-in TypeScript/JavaScript
  symbol extractor (`ts-morph`), ontology pack (launcher → core → policy →
  product → product-tail predicate rules), and deterministic semantic
  classifier (signal patterns + lane choice).
