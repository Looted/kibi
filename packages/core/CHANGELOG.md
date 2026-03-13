# kibi-core

## 0.1.8

### Patch Changes

- Fix MCP query consistency after upsert by normalizing source lookups and stabilizing tag filtering/dedup behavior.

  This resolves inconsistent `kb_query` results across `sourceFile` and `tags` filters and prevents duplicate entities when multiple tags match.

## 0.1.7

### Patch Changes

- 82b9742: Fix issue #53 npm consumer regressions

  - Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
  - Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
  - Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
  - Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
  - Added packed tarball E2E regression tests covering installed package behavior
