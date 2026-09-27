# kibi-plugin-jev

## 0.2.1

### Patch Changes

- Updated dependencies
  - kibi-plugin-sdk@0.3.0

## 0.2.0

### Minor Changes

- e6be0cc: Optional Jev plugins can now be configured from the environment after a normal `package.json` activation, and `kibi doctor` shows which capability plugins that activation selected.

  `TYPESAFE_API_KEY` remains the only credential and is never read from `package.json`. `KIBI_JEV_MODEL` selects the model (default `jev-latest`; a blank value is ignored). `KIBI_JEV_TIMEOUT_MS` sets a positive timeout up to 120000 milliseconds and fails with a clear provider error when the value is malformed. Explicit constructor options still win. Advisor and compile-intent results include plugin version, mode, external/network/metered flags, fallback, and the effective model when the classifier discloses one. Shadow comparisons stay out of the canonical result.

  - Resolve Jev model and timeout from the environment with programmatic precedence
  - Preserve optional `semanticClassifier.model` on provenance stamps
  - Report parsed `kibi.plugins` from `kibi doctor` without importing plugin packages

  ***

- 783cc75: Projects can optionally augment semantic lane classification with TypeSafe Jev without pulling TypeSafe into the default Kibi install.

  - Add optional `kibi-plugin-jev@0.1.0` implementing only `kibi.semantic-classifier.v1`
  - Lazy client creation, offline fixtures, and builtin fallback on failure
  - Kept out of default `kibi-cli` / `kibi-mcp` dependency trees

### Patch Changes

- b375e8f: This maintenance update brings the affected package code and tests into line with Kibi's Biome checks while preserving runtime behavior. It also replaces MCP non-null assertions with receiver-preserving method calls.

  - Format affected files, sort imports, and remove unnecessary template literals.
  - Preserve EngineClient `this` when forwarding optional Prolog methods.

- 8985874: Capability plugins now fail closed on unsafe resolution, poisoned loads, and silent classifier errors, and Jev records the model it actually called.

  Project config rejects duplicate package activation and duplicate replace providers. Package entry resolution uses Node/Bun as the source of truth and refuses entries that escape the package root, including via symlinks. A failed plugin import no longer poisons later retries in the same registry. Semantic classifier failures are returned as diagnostics instead of being swallowed, and Jev includes its configured model id in those diagnostics.

  - Validate duplicate plugin activation, secrets, and provider ids
  - Confine resolved plugin entries to the realpath'd package root
  - Evict rejected loadedPackages promises
  - Typed classifier attempt outcomes with diagnostics
  - Configurable Jev model (default `jev-latest`) on errors and requests

- Updated dependencies [e6be0cc]
- Updated dependencies [8985874]
- Updated dependencies [783cc75]
  - kibi-plugin-sdk@0.2.0

## 0.1.0

### Minor Changes

- Initial optional TypeSafe Jev semantic classifier for `kibi.semantic-classifier.v1`.
