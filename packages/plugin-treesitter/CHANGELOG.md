# kibi-plugin-treesitter

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
