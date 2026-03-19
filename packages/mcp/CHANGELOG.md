# kibi-mcp

## 0.3.1

### Patch Changes

- 5188a8f: Fix `kb_upsert` status validation so documented entity-specific lifecycle values like `open`, `passing`, and `accepted` are accepted again. The MCP tool schema now avoids advertising a stale fixed status enum, and the shared entity schema accepts both documented statuses and legacy compatibility values.
- 715c28a: Fix MCP write and validation consistency by making `kb_upsert` atomic across entity and relationship assertions, and aligning `kb_check` with the full aggregated rule set plus `.kb/config.json` check settings. This prevents partial writes on failed relationship links and keeps MCP traceability checks consistent with CLI expectations.
- Fix `kibi sync` false dangling-relationship warnings by validating relationship shards after entity IDs are loaded, repair sync cache `seenAt` timestamps so invalid cache entries trigger a safe re-import instead of silently skipping files, and harden KB persistence so read-only query/check flows no longer rewrite live RDF snapshots.
- 5188a8f: Remove unused internal MCP tool modules that are no longer part of the supported four-tool public surface. This reduces dead code and makes unit coverage reflect the live server behavior more accurately.
- Updated dependencies [4e05344]
- Updated dependencies [5188a8f]
- Updated dependencies
  - kibi-core@0.1.10
  - kibi-cli@0.2.6

## 0.3.0

### Minor Changes

- 582bede: Add `init-kibi` MCP prompt for retroactive repository bootstrapping. Update existing prompts with telemetry-driven best practices. Refresh tool descriptions with safety-focused guidance.

### Patch Changes

- Updated dependencies [29de3fa]
- Updated dependencies [0b11a77]
  - kibi-core@0.1.9
  - kibi-cli@0.2.5

## 0.2.4

### Patch Changes

- Fix MCP query consistency after upsert by normalizing source lookups and stabilizing tag filtering/dedup behavior.

  This resolves inconsistent `kb_query` results across `sourceFile` and `tags` filters and prevents duplicate entities when multiple tags match.

- Updated dependencies
  - kibi-core@0.1.8

## 0.2.3

### Patch Changes

- Fix `kb_query` behavior for `{ id, type }` lookups so missing entities return an empty result instead of a `Query failed` execution error.

  Add regression coverage to validate `delete -> query(id+type)` consistency in persistent MCP sessions.

## 0.2.2

### Patch Changes

- Fix stale read behavior in interactive MCP sessions by invalidating cached Prolog query results after successful write operations.

  Add a persistent-session regression test that verifies create/read/update/read and delete/read consistency in one MCP process.

- Updated dependencies
  - kibi-cli@0.2.3

## 0.2.1

### Patch Changes

- 82b9742: Fix issue #53 npm consumer regressions

  - Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
  - Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
  - Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
  - Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
  - Added packed tarball E2E regression tests covering installed package behavior

- Updated dependencies [82b9742]
  - kibi-core@0.1.7
  - kibi-cli@0.2.2
