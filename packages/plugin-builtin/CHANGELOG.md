# kibi-plugin-builtin

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
