# kibi-plugin-builtin

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
