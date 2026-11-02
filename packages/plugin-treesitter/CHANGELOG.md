# kibi-plugin-treesitter

## 3.0.0

### Major Changes

- f53950a: Source proofs now read Go, Java, C# and Rust. The `references` reader hands these files to `kibi-plugin-treesitter`, which lists what they import, call, read from the environment, pass as a first argument, throw and set as a property value, from their syntax trees and without compiling or running them. The kibi-usage skill (2.40.0) describes it.

  A new plugin capability, `kibi.reference-extractor.v1` (kibi-plugin-sdk), lets a plugin answer the `references` reader for a language Kibi does not parse itself. A provider returns the members it reads exactly and an `unresolved` row (line and text) for each construct it cannot read statically, and Kibi refuses the read with those places. `validateReferenceExtractionResult` checks results. The capability activates only in `augment` mode.

  `kibi-plugin-treesitter` provides it for Go, Java, C# and Rust, in the same bounded workers as symbol extraction. Members are written as the code names them: Go import paths, Java imports (`java.util.*`), C# `using` targets and Rust `use` paths expanded from their groups for `imports`; `os.Getenv`, `System.out.println` (and the method reference `System.out::println`), `Console.WriteLine` and `std::env::var` for `calls`, with `*.name` for a method on an expression Kibi cannot name; `os.Getenv`, `os.LookupEnv`, `System.getenv`, `Environment.GetEnvironmentVariable`, `env::var`, `env::var_os`, `env!` and `option_env!` for `env`; Go panics and Java and C# `throw new X()` for `thrown`; Go keyed literals and C# object, indexer and collection initializers for `property`. Names a file gives itself are followed: Go import aliases, Java single static imports, C# `using static` and `using X = ...` aliases and Rust `use` bindings (`use std::env::var as getvar`) read as the canonical name, and fully qualified forms (`java.lang.System.getenv`, `System.Environment.GetEnvironmentVariable`, `std::env::var`) match too: calls on `java.lang` and C# `System` types are listed under both spellings. C# `imports` also holds the project's `global using` lines, `<Using Include>` items and the usings `ImplicitUsings` adds, and `global::` prefixes are dropped. A function or method used as a value (`logf := logrus.Error`, a C# method group, a Rust path passed on) is listed in `calls`. A Go identifier that shadows a package the file does not import, and a Rust path whose root the file does not bind (a local `mod env`), are not taken for that package. A name computed at run time, the whole environment (including `os.ExpandEnv` and `Environment.ExpandEnvironmentVariables`), an environment getter handed on as a value (`g := os.Getenv`, `System::getenv`), a dot, static-wildcard or glob import that could bring a getter or call into scope, a call with no static name (`fs[0]()`, `<T as Tr>::m()`), reflection (also by fully qualified name, `Activator.CreateInstance` and Go `plugin`) and C# `dynamic` anywhere (for `calls` and `env` alike), a C# `#if` block, a Rust `#[cfg(...)]` item other than `#[cfg(test)]` (whose items are skipped), for Rust `calls` and `thrown` any macro invocation, attribute macro or derive outside the standard library, for Rust `env` a macro whose arguments mention a getter, and for `string_args` a macro whose arguments mention the callee fail the read with their place.

  Proofs use a reference extractor only when its installed files match the release-qualified closure Kibi ships, the same check impact review applies, so an unqualified or modified provider is never imported. Without an active provider the read is refused with what to install. `kibi init`, `kibi doctor` and `kb_plan_bootstrap` suggest `kibi-plugin-treesitter` for symbols when sources in any of its languages are tracked, and for proofs when Go, Java, C# or Rust sources are tracked and it is not active for them, with the exact `kibi.plugins` entry to add; a project without a `package.json` creates one that only holds Kibi's plugin list and gitignores `node_modules/`. `kb_plan_bootstrap`'s source glob now also covers `.pyi`, `.cxx`, `.hh`, `.hxx`, `.cs`, `.sh`, `.bash`, `.tf` and `.hcl`.

  `kibi-plugin-treesitter` 3.0 ships no grammars. Each grammar moved, unchanged, into its own data-only package, so a project downloads only the languages it uses and every language is installed the same way: `kibi-lang-python`, `kibi-lang-go`, `kibi-lang-rust`, `kibi-lang-java`, `kibi-lang-csharp`, `kibi-lang-php`, `kibi-lang-c`, `kibi-lang-cpp`, `kibi-lang-bash`, `kibi-lang-ruby`, `kibi-lang-hcl` (Terraform and HCL) and `kibi-lang-prolog` (SWI-Prolog), all at 1.0.0. JavaScript and TypeScript need no pack, since Kibi parses them itself. A pack holds the grammar WebAssembly and its license, with no code or install scripts. The plugin pins each pack's exact version and each grammar file's SHA-256 in `catalog.json` and lists the packs as optional peer dependencies in their major (`^1.0.0`); a worker checks the bytes before loading them. A file whose pack is missing (`TREESITTER_LANGUAGE_PACK_MISSING`) or another version (`TREESITTER_LANGUAGE_PACK_VERSION`) is now `unsupported` with the install line, and a modified grammar file is `failed` (`TREESITTER_LANGUAGE_PACK_MISMATCH`), for symbols and for references; neither is skipped. Packs resolve where Node finds them from the plugin (npm, pnpm and Bun; not Yarn Plug'n'Play). `kibi doctor` and `kibi init` name the packs the tracked sources need, and `kb_plan_bootstrap`'s plugin offer lists them in `alsoInstall`. `kibi doctor` also names an installed pack whose grammar does not match the pinned hash. While a pack is missing or another version, `kibi sync` warns once per file with the install line, and the staged check blocks a change to that file instead of asking for a whole-file review, so a missing install never disarms the gate.

  Symbol signatures that told overloads apart wrongly are fixed: C++ `f(int&&)` no longer reads as `f(int&)`, a C/C++ variadic `...` and parenthesized declarators (`int (*p)`) are kept, C# `ref`, `out` and `in` parameters and `params` methods get their own signature, Java comments inside a parameter list no longer drop it, and a C++ function declarator inside a parameter or template parameter list is not reported as a symbol. Symbols whose locator changes this way need their `symbols.yaml` entry updated once.

  A file the grammar reads only partly (a C `#include`, a Rust macro, a nested HCL block) no longer stops `kibi sync --refresh-symbol-coordinates` for the whole repository: symbols declared outside its uncovered ranges keep their coordinates, the others get none, and one warning per file names the lines and diagnostics. The staged check validates the same symbols and asks for a review only where a change touches an uncovered range. A file the analyzer cannot read as a whole (a syntax error, which the grammars also report for some valid code such as an `#ifdef` inside an `if`, a timeout or a changed grammar) gives only its own symbols no coordinates and is listed as a failed refresh; the rest of the repository still refreshes. Local gaps past the 64-diagnostic cap are summarized as one range instead of a whole-file limit, so large Terraform files keep their symbols. Kibi's own `.kb/` files are never analyzed as project source, so they no longer ask for kibi-lang-prolog, and a `.pl` file alone (often Perl) no longer counts as Prolog for the pack suggestion.

  The `references` readers refuse more constructs they cannot read exactly, so a claim such as "never calls X" or "reads no environment variable" can no longer pass on code that does. Go resolves a local `os` (parameter, block, `range`, type switch) and a non-standard package imported as `os` by scope, refuses cgo, `//go:linkname` and `.Environ()` for `env`, and lists a method on a receiver that visibly comes from package p also as `p.M`. Java follows receivers by declared type, cast and `new`, reads imports with comments, does not take `import other.System` or a `System` class declared in the file for `java.lang.System`, and refuses `getenv`, `exit`, `halt`, `exec`, `load` and `loadLibrary` on a receiver of unknown type. C# files a bare call under a type only when the file declares it or one known `using static` type has it, and refuses other bare calls and getters it cannot place; `@` verbatim identifiers are read without the `@`. Rust resolves paths through `use`, `mod` and `extern crate` in scope (`use Command as C`, `self::`, `extern crate std as s`) and refuses `env`, `imports` and `string_args` on macros outside the standard library and common formatting macros, `include!`, a nested `env!` and attributes configured with `env`. Kibi's Python reader follows import aliases for `env` and `calls`, reads `os.environ.setdefault`, `pop` and `in`, lists `from urllib import request` as `urllib.request` too, and refuses the whole environment handed on or copied, `getattr` on an imported module, `exec`, `eval`, `__import__`, `importlib.import_module`, `sys.modules` and star imports. Kibi's Prolog reader no longer fails on `meta_predicate` declarations, reads `apply/2` and literal `assertz` clauses, refuses `term_expansion` and `goal_expansion` in the files and in project files they load, refuses an `include` of a file outside `files`, and fails instead of silently dropping a loaded file it cannot read.

  A `references` claim is decided only where it holds. Reference members are matched by name segment (`.`, `/`, `::`), so `excludes` fails on a member under an excluded item (`java.sql` excludes `java.sql.Connection`, `github.com/labstack/echo/v4` excludes `.../echo/v4/middleware`), on the prefix of an item ending in `*` (`java.sql.*`, `os.*`), and, with the member, the item and the files named, on a member that may be the item: a wildcard import, a shorter name (`File.delete`) or a call on a receiver Kibi cannot name (`*.delete` may be `java.io.File.delete`). `includes` and `subset_of` count only members that certainly are an item, so `*.m` never satisfies `X.m` and `os` does not allow `os/exec`. A source proof is rejected when a symbol the test covers or that implements the claim's requirement lies in a file the read does not cover, and the refusal for files the reader cannot read no longer advises dropping them from `files`: it says the claim cannot be decided for them. An `eq`, `subset_of` or `excludes` claim read with `string_args` on an environment getter (`os.Getenv`, `env::var_os`, `System.getenv`, `getenv/2`, ...) is refused with a pointer to `extract: env`.

  Failures that looked like success are now reported. `kibi doctor` fails when a plugin `package.json#kibi.plugins` declares is not installed, and when the installed `kibi-plugin-treesitter` is not the release-qualified build this Kibi pins (such as an older build published under the same version), naming the fix. `kibi sync --refresh-symbol-coordinates` refuses, keeping the stored coordinates, instead of dropping them and reporting success. A symbol Kibi cannot place in its existing source file is reported by `kibi check` (advisory `symbol-coordinates-missing`, a warning) and by `kb_upsert`. `kibi prove` counts a test whose certificate or claim binding was rejected as `refused`, not `passed` (a `refused` field in its summary), and says when a derived binding cannot prove the claim because the receipt is not end to end; `kibi proof explain` and signoff list each claim's bindings and rejections whatever the requirement's proof status, and say why a derived claim is not yet proved.

  C and C++ headers are read as the compiler reads them: an include guard (`#ifndef G` / `#define G` ... `#endif`), the `#ifdef __cplusplus` / `extern "C" {` linkage guard and an `#if 0` block are blanked before parsing, keeping every line and column, so guarded headers keep their symbol coordinates and a header edit no longer blocks the commit. Terraform nested blocks (`validation`, `lifecycle`, `dynamic`, `ingress`) belong to the block that holds them and are no longer analysis gaps, and `moved`, `import`, `removed` and `check` blocks are neither symbols nor gaps. Past the 64-diagnostic cap, local gaps are merged into the fewest ranges that fit, closing first the gaps between them that hold no symbol start, so declarations between gap groups keep their coordinates instead of one range covering the rest of the file.

  ## Migration
  - Install the grammar packs for the languages you analyze next to the plugin, for example `npm install --save-dev kibi-plugin-treesitter@3 kibi-lang-python kibi-lang-go`. Python and SWI-Prolog need their packs too (`kibi-lang-python`, `kibi-lang-prolog`); until they are installed, symbol extraction for those files is unsupported, while Kibi's own Python and Prolog source-proof readers keep working. `kibi doctor` prints the exact line for the tracked sources. Until the packs are installed, those files are reported as unsupported instead of analyzed.
  - Re-check `excludes` reference claims written against a parent name or with a trailing `*`: they now fail on members under it, and claims over files with `*.m` calls or short names that may be an excluded item are refused. A proof whose test covers, or whose requirement is implemented by, a symbol outside `files` is rejected until those files are read. Rewrite environment claims read with `string_args` on a getter to `extract: env`. Scripts that read `kibi prove`'s `passed` count now see refused tests under `refused`.
  - To prove references in Go, Java, C# or Rust, also add `"kibi.reference-extractor.v1": { "mode": "augment" }` to the `kibi-plugin-treesitter` entry of `package.json#kibi.plugins`.

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
