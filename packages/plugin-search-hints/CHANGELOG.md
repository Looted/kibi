# kibi-plugin-search-hints

## 2.0.0

### Minor Changes

- 4cddea5: `kb_search` and `kibi search` now answer a question with decisions: five one-line cards for the requirements and ADRs that match it best, and up to seven more decisions related by meaning.

  - Each card is one line of at most 300 characters. The words of the question are ranked over each decision's title, statement, facts and implementing symbols, and decisions scoped to the files you pass rank first. Near-identical decisions share one card, which lists the ones folded into it (`fields: "full"`).
  - When the search-hints plugin is installed, its meaning ranking is fused into every search instead of being asked only for weak answers, and the decisions it finds that are not already a card are listed beside the cards. A decision is credited with the meaning of the scenarios, tests and facts it links. Without the plugin, or when it fails, the words rank alone.
  - A requirement is named as governing only when its card covers at least half of the question. When no card does, the answer is weak: it names no governing requirement, lists the question's words that no decision holds, and never says that nothing governs.
  - Passing `type` (`fact`, `scenario`, `test`, `symbol`) searches those entities as before, ten rows by default.
  - `kibi.search-hints.v1` providers are now asked to score every decision and the entities it links, up to 50,000 entities per call (`SEARCH_HINTS_MAX_LIMIT`), instead of returning at most 20 hints.

- ac9b526: Search hints now embed text with potion-retrieval-32M, a static model2vec embedding tuned for retrieval, instead of potion-base-8M. On Kibi's own 20 reworded questions the expected requirement is in the top three or the hints for 14 instead of 12, and on a 44-requirement product knowledge base for 19 of 20 lay questions instead of 17. The model is still offline, MIT licensed and pure TypeScript; the package grows from about 8 MB to about 33 MB, and entity vectors are rebuilt once after the upgrade because the cache is keyed by the model.

  Reading the vector cache and scoring entities no longer goes through a per-value callback, so a weak search with hints costs about the same time with the larger model as it did with the smaller one.

### Patch Changes

- df6dbfd: Fixes across setup guard rails, `kb_search`, host integrations, coverage/modeling parity, and release gates ahead of 2026.11.6. Staged commit checks now read the Kibi level from the staged snapshot, shell hooks and non-interactive `kibi init --level` protect recorded Kibi levels and `required_evidence` floors consistently across all hosts, `kb_search` respects branch-store freshness, marks close governing matches as candidates, filters low-similarity meaning noise, and renders readable CLI tables, and `kibi-antigravity` / `kibi-vibe` hooks and MCP launchers work reliably in both workspace and user-global installs.

  Technical summary:

  - Setup & levels: `kibi check --staged` reads `kibi.level` from the captured staged/base Git trees and notes level changes; `kibi init --level` refuses to overwrite a different recorded level non-interactively without `--change-level` and warns instead of crashing on malformed `package.json`; `kibi check` prints unknown-level diagnostics in text and JSON, filters verification quality reviews (`coverage_depth_review`, `logical_coverage_review`) at level `remember`; `kibi doctor` reports the Kibi level and marks Git hooks not applicable outside Git; `kibi migrate` previews managed hook refreshes on schema upgrades and refreshes outdated Kibi-managed blocks in `AGENTS.md`/`CLAUDE.md`/`GEMINI.md`; `kibi signoff` compares against merge-base on clean branches; `kibi-runtime` filters `kibi-provable-code` from `kb_skills list` at `remember`; `kibi-mcp` server instructions omit test-run prompts at `remember`; `evidence-floor` guidance asks the person instead of lowering floors; `result-budget` keeps a truncated prefix and `source` hint for oversized single fields; `kibi init` records fixed telemetry error categories on every refusal.
  - Guard rails & hosts: `kibi-agent-core` parses requirement frontmatter with `yaml` (fail-safe on malformed YAML), resolves requirements by frontmatter `id`, handles Codex `apply_patch` multi-hunk edits, guards `kb_delete`/`kb_apply_plan` and shell `kibi init --level` / file writes, bounds regex execution in read-context matching, fixes shell redirection (`2>file`), destructive command detection, and `sed`/`head`/`tail`/`grep` read parsing, and recognizes `mcp_<server>.<tool>` tool names. `kibi-antigravity` returns `allow` (never spurious `ask` or `auto_approve`) as `PreToolUse` pass-through, hardens Windows `run-node.cmd` and `hooks.json` quoting, scopes `kb-tools.ts` `workspaceRoot` injection to Kibi MCP servers, uses `0700` uid-checked temp state dirs, and adds hook-bundle drift checks in CI/publish workflows. `kibi-vibe` supports deferred MCP `roots/list` + `workspaceRoot` attach for user-scope installs, guards `bash` edits and `mcp_kibi.kb_*` / `kb_record` calls, and secures temp launcher logs/state. `kibi-cursor` delivers held rule-capture notes on any next pre-tool call. `kibi-usage` skill (`3.2.1`) documents read/search hook rows across all host mirrors.
  - Search: `kb_search` cross-checks decision corpus cards and seeds against the attached branch store (never naming un-ingested or corpus-superseded requirements as `Governing`, emitting stale metadata when corpus and store diverge), flags close top governing requirements as `ambiguous` with candidate wording (`REQ-kb-search-close-matches-candidates`), applies a `MIN_MEANING_SCORE` floor (`0.22`), restores `kb_query` title-listing `nextActions` on weak/abstained searches, fixes empty-KB notes, renders card lines and digest headers in CLI tables, places `[retired]`/`[superseded]`/`[closed]` beside card IDs while preserving prohibition clauses on truncation, excludes rationale/context sections from governing coverage, seeds folded decisions by parent card coverage, and rejects whitespace-only queries with `VALIDATION_FAILED`.
  - Modeling, coverage, bootstrap & gates: `kb_coverage` preserves caller `limit` when all rows fit within the result budget so CLI and MCP return identical `repairPlanId` and `legacyMigrationPlan.planId`; `kb_model` preserves existing requirement `title`, `status`, `text_ref` and `tags` when targeting an existing `requirementId` (fixing `kb_record(saidBy: "user")` -> `kb_model` -> `kb_upsert` on firm requirements); bootstrap skips `<!-- BEGIN/END kibi-managed -->` blocks in `AGENTS.md`; `ci-proof-reuse.ts` and `proof.yml` resolve `kibi-requirement-proof` from `derived_from` on member-reused trains and fall back to full proof if the report artifact is missing; merge-train treats newline-containing check lists (including single-entry YAML block scalars) as one check per line; `owner-findings` marks unrecorded extracted declarations as `new`; Playwright narrowing regex-escapes bound spec paths; `plugin-search-hints` and `plugin-treesitter` asset verifiers accept `-dev.` stamped prerelease versions; release docs list all post-`version-packages` refresh steps.

- a4019b7: Search hints are now on by default. `kibi-plugin-search-hints` ships with `kibi-cli` and `kibi-runtime` (and so with the MCP server and every agent integration). On every default `kb_search`, its meaning scores are fused into the decision-card ranking and up to seven additional related decisions appear in `queryAnalysis.hints.items`, with no setup. A project that names its own `kibi.search-hints.v1` provider in `kibi.plugins` keeps it, in any mode, and `kb_search` with `hints: false` still skips hints for one call.

  The bundled model package adds about 33 MB to an install. Its model is English-only. To turn the default off, for example because the knowledge base is not written in English, the environment does not allow a bundled model, or another provider is configured instead, list the package in `package.json`:

  ```json
  { "kibi": { "declinedPlugins": ["kibi-plugin-search-hints"] } }
  ```

  The provider stamp of the bundled plugin reads `external: false`, which tells it from a provider the project configured. Bootstrap no longer offers the plugin, and the bootstrap and usage skills say it is on and how to turn it off.

- Updated dependencies [4cddea5]
  - kibi-plugin-sdk@0.9.0

## 1.0.1

### Patch Changes

- The package now ships `catalog.json`, which its `integrity.json` lists. Earlier tarballs left it out, so the integrity manifest named a file that was not installed.

## 1.0.0

### Patch Changes

- Updated dependencies [69b636f]
  - kibi-plugin-sdk@0.8.0

## 0.1.3

### Patch Changes

- 8b37f2d: Remove the `// implements REQ-...` comments from the plugin sources. Kibi no longer reads them; behavior is unchanged.

## 0.1.2

### Patch Changes

- e0796af: Accept kibi-plugin-sdk 0.7 as a peer dependency.

## 0.1.1

### Patch Changes

- 048d1c9: Close false proofs found by testing the language packs before release:
  - A references claim whose subject key or claim text names a project file (also with a repository prefix, another letter case, no extension, or spaces) is rejected unless that file is among the files read, so a claim about one file cannot be decided on another.
  - `excludes` now fails on a longer name ending in the excluded item at a segment boundary (`checkNotNull` excludes `Preconditions.checkNotNull`).
  - Rust raw identifiers (`std::r#env::var`) are read as their plain names.
  - C# method groups handed on as values (`Environment.Exit` in a switch arm, `??`, `yield return`, a lambda body, `!`) count as calls, as does a method group on any receiver (`Process.GetCurrentProcess().Kill`); an `Environment` that is not provably `System.Environment` (pattern or `out` variable, type parameter, primary-constructor parameter, alias, a project type) refuses or is read as what it binds.
  - Go: env reads through a helper or variable in another file of the package, or in another package of the project, refuse; a package imported under a well-known name (`logrus`, `exec`) is listed by its import path.
  - Java: a `System` class of the same package in another source root refuses `System` reads.
  - Python: references through a module's private name (`from tempfile import _os`), reflection on a module (`getattr`, `vars`, a module assigned to a name) and ctypes or cffi refuse; `posix.X` and `nt.X` are read as `os.X`.
  - SWI-Prolog: goals in `'~@'` message lines and in grammar bodies passed to `phrase`/`call_dcg` are read; an aliased include resolves only through the `file_search_path` declarations read, never by path suffix, and include refusals name the file to add to `files:` only when it is the exact resolution.
  - The Cursor hook runner is a self-contained bundle, so a copied or GitHub-installed plugin no longer fails with `ERR_MODULE_NOT_FOUND`.
  - Plugins accept kibi-plugin-sdk 0.6 as a peer.

## 0.1.0

### Minor Changes

- f3150b5: `kb_search` can now suggest which requirements a weakly answered question probably means, found by meaning instead of shared words. Install the optional `kibi-plugin-search-hints` and activate `kibi.search-hints.v1` in `replace` mode under `package.json` `kibi.plugins`. When the intent answer abstains or its top score is below 0.44, `queryAnalysis.hints` lists up to ten current requirements (a hit on a scenario, test or fact is shown as its requirement, under `via`) and the text names the first five. Hints never change the ranked results, the answer layer or abstention, and `hints: false` turns them off. On Kibi's own KB, 20 reworded questions found the right requirement 2 times in the top three; with hints it is shown 14 times.

  - New package `kibi-plugin-search-hints` bundles the MIT-licensed potion-base-8M static embedding (about 7.7 MB, int8) with a pure JavaScript tokenizer checked against the upstream one. It needs no network, native code or download, and caches entity vectors in Kibi's runtime directory, rebuilding only entities whose text changed. It is optional and not part of the default install.
  - `kibi-plugin-sdk` adds the `kibi.search-hints.v1` capability and `validateSearchHintsResult`: a provider may name only the entities it was given, at most 20, scored between 0 and 1 in score then id order. `augment` mode is rejected for it.
  - A provider that throws, times out, returns an invalid result or cannot load gives no hints and a diagnostic; the search still answers.
  - `kb_plan_bootstrap` offers `kibi-plugin-search-hints` once the KB holds 50 or more requirement documents. Plugin offers now carry the `mode` to activate them in. The `kibi-usage` and `kibi-bootstrap` skills cover hints and the offer.

  Migration: none required. Without the plugin, `kb_search` answers exactly as before.
