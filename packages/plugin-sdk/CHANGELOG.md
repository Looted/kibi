# kibi-plugin-sdk

## 0.3.1

### Patch Changes

- Large source files now return a useful, explicit analysis failure instead of causing a second validation error when the host reports that a file exceeded its analysis limit. The SDK keeps ordinary results within a shared UTF-16 size bound and accepts oversized failures only when they contain no symbols or source ranges. This preserves clear diagnostics without trusting coordinates that cannot be safely checked.

  - Export a shared UTF-16 source-analysis limit from the SDK and use it in the host.
  - Validate oversized failures without splitting the source into lines, while rejecting non-failure statuses and any source-derived ranges.
  - Keep the existing UTF-8 byte cap as an additional host resource bound.

## 0.3.0

### Minor Changes

- Projects can opt into offline Python, Go and Rust symbol analysis while retaining the existing JavaScript and TypeScript workflow. Staged checks use captured source and knowledge from the same Git snapshot, so unstaged files cannot supply missing ownership evidence. Incomplete parsing and provider failures remain explicit instead of appearing as successful empty results.

  - Add the asynchronous symbol extractor v2 contract and source-bound validation.
  - Qualify an optional Tree-sitter package with pinned WASM grammars, queries, runtime assets and license provenance.
  - Analyze immutable Git versions and verify approved source analyzers before importing maintenance plugins.

## 0.2.0

### Minor Changes

- e6be0cc: Optional Jev plugins can now be configured from the environment after a normal `package.json` activation, and `kibi doctor` shows which capability plugins that activation selected.

  `TYPESAFE_API_KEY` remains the only credential and is never read from `package.json`. `KIBI_JEV_MODEL` selects the model (default `jev-latest`; a blank value is ignored). `KIBI_JEV_TIMEOUT_MS` sets a positive timeout up to 120000 milliseconds and fails with a clear provider error when the value is malformed. Explicit constructor options still win. Advisor and compile-intent results include plugin version, mode, external/network/metered flags, fallback, and the effective model when the classifier discloses one. Shadow comparisons stay out of the canonical result.

  - Resolve Jev model and timeout from the environment with programmatic precedence
  - Preserve optional `semanticClassifier.model` on provenance stamps
  - Report parsed `kibi.plugins` from `kibi doctor` without importing plugin packages

  ***

- 783cc75: Authors can build third-party Kibi capability plugins against a published, dependency-free SDK instead of private CLI types.

  - Add `kibi-plugin-sdk@0.1.0` with `kibi.plugin.v1` protocol types, capability IDs, `defineKibiPlugin`, and runtime validators
  - No runtime dependency on `kibi-cli` or TypeSafe

### Patch Changes

- 8985874: Capability plugins now fail closed on unsafe resolution, poisoned loads, and silent classifier errors, and Jev records the model it actually called.

  Project config rejects duplicate package activation and duplicate replace providers. Package entry resolution uses Node/Bun as the source of truth and refuses entries that escape the package root, including via symlinks. A failed plugin import no longer poisons later retries in the same registry. Semantic classifier failures are returned as diagnostics instead of being swallowed, and Jev includes its configured model id in those diagnostics.

  - Validate duplicate plugin activation, secrets, and provider ids
  - Confine resolved plugin entries to the realpath'd package root
  - Evict rejected loadedPackages promises
  - Typed classifier attempt outcomes with diagnostics
  - Configurable Jev model (default `jev-latest`) on errors and requests

## 0.1.0

### Minor Changes

- Initial `kibi.plugin.v1` protocol: semantic classifier, ontology pack, and symbol extractor capability contracts with validation helpers.
