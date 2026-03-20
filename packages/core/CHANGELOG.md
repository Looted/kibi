# kibi-core

## 0.1.10

### Patch Changes

- 4e05344: Align core status semantics with the documented entity-specific lifecycle values so requirement and ADR derivations treat canonical states like `open`, `in_progress`, `closed`, `accepted`, `deprecated`, and `superseded` consistently.
- Fix `kibi sync` false dangling-relationship warnings by validating relationship shards after entity IDs are loaded, repair sync cache `seenAt` timestamps so invalid cache entries trigger a safe re-import instead of silently skipping files, and harden KB persistence so read-only query/check flows no longer rewrite live RDF snapshots.

## 0.1.9

### Patch Changes

- 29de3fa: Bump patch version for safe release

## 0.1.8

### Patch Changes

- Fix `kb_entities_by_source` Prolog predicate to use `source=` (matching entity property format) instead of `source-`, and normalize source values via `source_value_atom/2` to handle both atom and string types.

  This resolves inconsistent `kb_query` results when filtering by `sourceFile`.

## 0.1.7

### Patch Changes

- 82b9742: Fix issue #53 npm consumer regressions

  - Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
  - Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
  - Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
  - Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
  - Added packed tarball E2E regression tests covering installed package behavior
