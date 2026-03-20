# kibi-cli

## 0.2.6

### Patch Changes

- 5188a8f: Fix `kb_upsert` status validation so documented entity-specific lifecycle values like `open`, `passing`, and `accepted` are accepted again. The MCP tool schema now avoids advertising a stale fixed status enum, and the shared entity schema accepts both documented statuses and legacy compatibility values.
- Fix `kibi sync` false dangling-relationship warnings by validating relationship shards after entity IDs are loaded, repair sync cache `seenAt` timestamps so invalid cache entries trigger a safe re-import instead of silently skipping files, and harden KB persistence so read-only query/check flows no longer rewrite live RDF snapshots.
- Updated dependencies [4e05344]
- Updated dependencies
  - kibi-core@0.1.10

## 0.2.5

### Patch Changes

- 0b11a77: Add missing `./prolog/codec` export to package.json

  The MCP package imports `escapeAtom` and `toPrologAtom` from `kibi-cli/prolog/codec`,
  but this subpath was not exported in the package.json. This caused the MCP server
  to crash on startup with `ERR_PACKAGE_PATH_NOT_EXPORTED` when the package was
  installed from npm.

- Updated dependencies [29de3fa]
  - kibi-core@0.1.9

## 0.2.4

### Patch Changes

- ec7f86e: Fix sync command to process relationship shards added after initial sync. The sync command now properly detects and imports relationship shard files (`.kb/relationships/*.yaml`) that are added after the first sync, instead of exiting early with "no changes".

## 0.2.4

### Patch Changes

- Fix sync command to process relationship shards added after initial sync. The sync command now properly detects and imports relationship shard files (`.kb/relationships/*.yaml`) that are added after the first sync, instead of exiting early with "no changes".

- Add explicit `id` fields to sync test fixtures for predictable relationship testing.

## 0.2.3

## 0.2.3

### Patch Changes

- Fix stale read behavior in interactive MCP sessions by invalidating cached Prolog query results after successful write operations.

  Add a persistent-session regression test that verifies create/read/update/read and delete/read consistency in one MCP process.

## 0.2.2

### Patch Changes

- 82b9742: Fix issue #53 npm consumer regressions

  - Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
  - Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
  - Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
  - Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
  - Added packed tarball E2E regression tests covering installed package behavior

- Updated dependencies [82b9742]
  - kibi-core@0.1.7
