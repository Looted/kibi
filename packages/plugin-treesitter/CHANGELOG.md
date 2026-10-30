# kibi-plugin-treesitter

## 2.1.0

### Minor Changes

- cd5b519: Kibi now understands SWI-Prolog source. With `kibi-plugin-treesitter` installed, each predicate is one symbol named `name/arity` (`name//arity` for DCG rules), spanning its PlDoc block through its last clause, so a symbol in `.kb/symbols.yaml` can point at a single predicate and staged impact names the predicate whose clauses changed instead of the whole file. Clauses for another module (`lists:append(...)`) are qualified with that module. plunit tests are symbols too: a `begin_tests(Unit)` block is a `Unit` symbol and each `test(Name)` inside it is `Unit:Name`. The grammar is `tree-sitter-swi-prolog` 0.1.0 (MIT), pinned and shipped as WASM like the other grammars.

  `.plt` files are classified as Prolog test source. A `.pl` file without a language hint or shebang is no longer always left ambiguous between Perl and Prolog: Kibi reads its first 64 KiB and picks Prolog when the leading lines look like Prolog (`:-` directives, clauses, DCG rules) and not Perl, or Perl when they look like Perl (`use strict`, `package`, `sub`, `my $x`) and not Prolog. A file that matches both or neither stays ambiguous. Perl remains file-level.

  Bootstrap discovery (`kibi plan-bootstrap`, `kb_plan_bootstrap`) now scans `.pl` and `.plt` files. A `:- module(Name, Exports)` directive becomes source-module evidence that lists the module's exported predicates, and `.plt` files count as plunit test topology.

  `kibi check` no longer fails with "get_dict/3: Type error" when a requirement's `origin.ref` quotes a URL. Origin values containing `/` were cut at their last slash, so such a requirement also lost its `approved_by` and `kind`, which changed its evidence level.

## 2.0.2

### Patch Changes

- 1fea8f6: Fixes from running the formal-proof lane on two test projects.

  **Migration note:** a type-shape symbol (interface, type alias, enum) covered by a unit test now counts as covered only while that unit test has a current passing receipt; an authored `status: passing` is no longer enough. After upgrading, give those unit tests a `proof_contract` and run `kibi prove --stale`. Until then coverage lists the symbols in `uncoveredSymbols` with `structural_unit_receipt_not_current`.
  - `kibi migrate` pins a `tested` floor only where the proof ladder would accept it (newest receipt, every gap), so a migrated project no longer starts with dozens of `evidence-floor` violations.
  - `kibi check` prints the evidence-floor suggestion in text output without `--fix`, and the suggestion names the failing receipts, uncovered symbols and missing coordinates.
  - `kibi coverage --status` judges receipts with the same per-contract binding as the unfiltered report.
  - Certificate domains: `domain_source.export` names the export when it differs from the symbol title; TypeScript domains load through bun, the workspace's tsx, or node with a resolve hook for extensionless and `.js` imports; imports of compiled output map back to sources through `tsconfig.json`; Python domains (`Enum`, `dict`, list, tuple, set) load with `python3`.
  - An exported constant matched by name is judged as a narrow symbol by the upsert granularity check, as the staged gate and `kibi check` already did.
  - `kibi prove` no longer prints a raw `git show` error for a newly added test document, attributes a valid all-pass test report per test, and stops the producer's whole process group on Ctrl-C.
  - New `kibi prove --stale` reruns only tests without a current passing receipt.
  - New `success_policy: own_results_first_attempt` judges each obligation by its own native-case result when a run failed only in execution, so one unrelated failing Playwright case no longer fails every receipt of the suite. The Playwright reporter now marks global errors (`setup`), global timeouts (`timed_out`) and interruptions as run-level failures, which still refuse every obligation.
  - `kibi prove` prints each integration it starts and ingests on stderr, records ingested integrations in `.kb/proof/runs/prove-progress.json`, and `kibi prove --resume` skips integrations an interrupted run already ingested at the same snapshot.
  - With `--test`, `--requirement` or `--stale`, a direct `playwright test` integration runs only the selected tests' `proof_bindings[].source_file` spec files; every producer receives them as `KIBI_PROOF_SOURCE_FILES`.
  - New `kibi proof run-steps` runs `proof/steps.json` as a `command` integration and writes the per-test report.
  - Receipt binding ignores a test document's `links`, so adding a link no longer stales its receipts; receipts bound the earlier way stay current.
  - The tree-sitter analyzer keeps a file with more than 64 decorated declarations decorator-only (the last diagnostic summarizes the rest), so `kibi sync --refresh-symbol-coordinates` no longer aborts on it.
  - `kibi sync --refresh-symbol-coordinates` counts refreshed symbols against the stored coordinate artifact.
  - New `coarse_anchor_only_review` diagnostic for requirements implemented only by whole-file anchors.
  - `kibi proof inspect` detects `node --test` and `bun test` in root and workspace scripts.
  - `kibi doctor` warns instead of failing when an augment-mode plugin's secret is missing, and the merge-driver setup names the project's package manager.
  - `kibi coverage` text output groups traceability and proof counts.
  - Claim texts that differ only in whitespace or trailing punctuation match.
  - `pack:all -- --dev-version` stamps local packs `<version>-dev.<sha>`.

## 2.0.1

### Patch Changes

- 63e0e1f: The Claude and Codex plugin packages now ship their own license and security policy files, so the terms and the vulnerability reporting route travel with the installed plugin. The tree-sitter analyzer also words one PHP diagnostic without a literal call-syntax example.

  Adds `LICENSE` and `SECURITY.md` to both plugin packages' `files`, rewords the PHP `eval` diagnostic message in the analysis worker, and refreshes the integrity manifest and release approval hashes for the rebuilt worker.

## 2.0.0

### Patch Changes

- Updated dependencies [ee91b85]
  - kibi-plugin-sdk@0.5.0

## 1.0.1

### Patch Changes

- 2a2b2db: Every Kibi package page on npm now has a README that says what the package is for and how to install it, and links to the documentation site. Package metadata now points npm's "Homepage" link at the documentation site, its "Repository" link at the package's own folder on GitHub, and adds an "Issues" link.

  Adds READMEs to `kibi-cli`, `kibi-mcp`, `kibi-core`, `kibi-runtime`, `kibi-agent-core`, `kibi-codex`, `kibi-plugin-builtin` and `kibi-plugin-sdk`. Sets `homepage` to https://looted.github.io/kibi/, adds `repository.directory` and `bugs` to every package, and refreshes the `kibi-plugin-treesitter` integrity manifest and source-analyzer approval for its changed `package.json`.

## 1.0.0

### Patch Changes

- Updated dependencies [db5376c]
- Updated dependencies [8622782]
  - kibi-plugin-sdk@0.4.0

## 0.2.1

### Patch Changes

- Opt-in performance observations now make it easier to understand staged checks without changing their results. When explicitly enabled, Kibi reports bounded parser phase timings and distinguishes real Prolog query round trips from cache hits, while keeping goals, source text, and paths out of the timing records.
  - Add private, bounded, best-effort Prolog timing trace events and opt-in Tree-sitter worker phase observations.
  - Keep timing observations outside public result schemas and add regressions for result equality, cache labeling, and failure preservation.

## 0.2.0

### Minor Changes

- Kibi now extracts structured symbols across a broader set of common programming and configuration languages, while keeping parser assets available offline in the installed package. JavaScript and TypeScript extraction also handles script files and more declaration forms consistently. The runtime package receives the matching capability updates so installed Kibi uses the same analyzers as development builds.
  - Expand Tree-sitter language and declaration coverage with pinned grammar assets, queries, licenses, and integrity metadata.
  - Improve built-in JavaScript and TypeScript script analysis and source analyzer selection.
  - Update CLI and runtime package wiring for the expanded analyzer catalog.

## 0.1.2

### Patch Changes

- Search remains usable when test histories contain many proof receipts, and Node applications can start a parser from an evaluated module entrypoint. Full search results still include the selected entities' complete receipt histories, while summary results avoid serializing histories that ranking does not need. Parser workers retain their existing resource limits and never execute the analyzed program.
  - Project indexed search candidates before transport and hydrate only selected full entities; preserve ranking, facets, and explicit transport failures.
  - Start parser file workers without inheriting evaluation-only Node flags; verify the actual public subprocess path.

## 0.1.1

### Patch Changes

- Projects can opt into offline Python, Go and Rust symbol analysis while retaining the existing JavaScript and TypeScript workflow. Staged checks use captured source and knowledge from the same Git snapshot, so unstaged files cannot supply missing ownership evidence. Incomplete parsing and provider failures remain explicit instead of appearing as successful empty results.
  - Add the asynchronous symbol extractor v2 contract and source-bound validation.
  - Qualify an optional Tree-sitter package with pinned WASM grammars, queries, runtime assets and license provenance.
  - Analyze immutable Git versions and verify approved source analyzers before importing maintenance plugins.
