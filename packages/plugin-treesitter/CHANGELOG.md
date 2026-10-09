# kibi-plugin-treesitter

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
